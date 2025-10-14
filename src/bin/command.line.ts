import { parse } from 'shell-quote';
import logger from '../common/logger'
import { callCore} from '../common/runner'

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
