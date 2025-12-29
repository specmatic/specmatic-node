import execSh from 'exec-sh';
import path from 'path';
import { specmaticCoreJarName } from '../config';
import logger from '../common/logger';
import { ChildProcess, exec, spawn, SpawnOptions } from 'child_process';

const callCore = (args: (string | number)[], done: (error: any) => void, onOutput: (message: string, error: boolean) => void, jvmArgs: string[] = []): ChildProcess => {
    const rootPath = path.resolve(__dirname, '..', '..');
    const specmaticJarPath = path.resolve(rootPath, specmaticCoreJarName);
    return callJar(specmaticJarPath, args, done, onOutput, jvmArgs);
};

function callJar(jarPath: string, args: (string | number)[], done: (error: any) => void, onOutput: (message: string, error: boolean) => void, jvmArgs: string[] = []): ChildProcess {
    const argsList: string[] = [...jvmArgs];
    if (process.env['endpointsAPI']) {
        argsList.push(`-DendpointsAPI="${process.env['endpointsAPI']}"`);
    }
    // Pass configuration through environment variables instead of JVM -D system properties
    const envVars: NodeJS.ProcessEnv = { ...process.env };
    if (!envVars['SPECMATIC_EXECUTOR']) {
        envVars['SPECMATIC_EXECUTOR'] = "npm"
    }

    argsList.push(...['-jar', jarPath]);
    argsList.push(...args.map(arg => String(arg)));
    const prettyPrintedCLIArgs = [`java`, ...argsList].map(arg => JSON.stringify(arg)).join(' ');

    logger.info(`CLI: Running command: ${prettyPrintedCLIArgs}`);
    const javaProcess: ChildProcess = spawn('java', argsList, { stdio: 'pipe', stderr: 'pipe', shell: false, env: envVars } as SpawnOptions);
    javaProcess.stdout?.on('data', function (data: String) {
        onOutput(`${data}`, false);
    });
    javaProcess.stderr?.on('data', function (data: String) {
        onOutput(`${data}`, true);
    });
    javaProcess.on('close', function (code:number) {
        if (code) {
            done(new Error('Command exited with non zero code: ' + code))
        } else {
            done(null);
        }
    });
    return javaProcess;
}

export { callCore };
