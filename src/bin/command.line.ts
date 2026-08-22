import path from 'path';
import { spawn } from 'child_process';
import { parse } from 'shell-quote';
import logger from '../common/logger'
import { callCore} from '../common/runner'
import { specmaticCoreJarName } from '../config';

const getCommandPath = (args: string[]) => args.filter(arg => !arg.startsWith('-'));

const isMcpServerCommand = (args: string[]) => {
    const commandPath = getCommandPath(args);
    return commandPath.length >= 2 && commandPath[0] === 'mcp' && commandPath[1] === 'server';
};

const callMcpServerDirectly = (args: string[], jvmArgs: string[]) => {
    const rootPath = path.resolve(__dirname, '..', '..');
    const specmaticJarPath = path.resolve(rootPath, specmaticCoreJarName);
    const argsList: string[] = [...jvmArgs, '-jar', specmaticJarPath, ...args];
    const envVars: NodeJS.ProcessEnv = { ...process.env };

    if (!envVars['SPECMATIC_EXECUTOR']) {
        envVars['SPECMATIC_EXECUTOR'] = 'npm';
    }

    const javaProcess = spawn('java', argsList, { stdio: 'inherit', shell: false, env: envVars });

    javaProcess.on('error', () => {
        process.exitCode = 1;
    });

    javaProcess.on('close', (code: number | null) => {
        process.exitCode = code ?? 1;
    });
};

const callSpecmaticCli = (argsv?: string[]) => {
    const args = argsv || process.argv.slice(2);

    // Parse JAVA_OPTS and take only string arguments from the beginning until we hit a non-string
    const parsedArgs = parse(process.env.JAVA_OPTS || '');
    const jvmArgs: string[] = [];
    for (const arg of parsedArgs) {
        if (typeof arg === 'string') {
            jvmArgs.push(arg);
        } else {
            // Stop processing when we encounter a non-string (shell operator, comment, etc.)
            break;
        }
    }

    if (isMcpServerCommand(args)) {
        callMcpServerDirectly(args, jvmArgs);
        return;
    }

    callCore(
        args,
        (err?: any) => {
            if (err) {
                logger.info('CLI: Finished with non zero exit code: ', err.code)
                process.exitCode = err.code
            } else {
                logger.info('CLI: Finished')
                process.exitCode = 0
            }
        },
        message => {
            console.log(`${message}`)
        },
        jvmArgs
    );
}

export default callSpecmaticCli
