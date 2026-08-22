import path from 'path';
import callSpecmaticCli from '../command.line';
import { specmaticCoreJarName } from '../../config';
import fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import { mock as jestMock, mockReset } from 'jest-mock-extended';
import { Readable } from 'stream';

jest.mock('child_process');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const javaProcessMock = jestMock<ChildProcess>();
const readableMock = jestMock<Readable>();
javaProcessMock.stdout = readableMock;
javaProcessMock.stderr = readableMock;

beforeEach(() => {
    jest.resetAllMocks();
});

test('passes arguments to the jar', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const testArgs = ['test', '--testBaseURL', 'http://localhost:9000', `--filter=PATH='/todos/add' || STATUS='404'`, '--foo=bar', '1', '2'];
    callSpecmaticCli(testArgs);
    const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);
    expect(mockSpawn.mock.calls[0][0]).toBe(`java`);
    expect(mockSpawn.mock.calls[0][1]).toEqual([`-jar`, path.resolve(specmaticJarPath), `test`, `--testBaseURL`, `http://localhost:9000`, `--filter=PATH='/todos/add' || STATUS='404'`, `--foo=bar`, `1`, `2`]);
});

test('parses JAVA_OPTS and stops at shell operators', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Set JAVA_OPTS with shell operators
    const originalJavaOpts = process.env.JAVA_OPTS;
    process.env.JAVA_OPTS = '-Xmx1024m -Dtest=value > output.log';

    try {
        callSpecmaticCli(['test']);
        const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);

        // Should only include JVM args before the shell operator
        expect(mockSpawn.mock.calls[0][1]).toEqual([
            '-Xmx1024m',
            '-Dtest=value',
            '-jar',
            path.resolve(specmaticJarPath),
            'test'
        ]);
    } finally {
        // Restore original JAVA_OPTS
        if (originalJavaOpts !== undefined) {
            process.env.JAVA_OPTS = originalJavaOpts;
        } else {
            delete process.env.JAVA_OPTS;
        }
    }
});

test('parses JAVA_OPTS with quotes and stops at comments', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const originalJavaOpts = process.env.JAVA_OPTS;
    process.env.JAVA_OPTS = '-Xmx512m -Dmy.prop="quoted value" # this is a comment';

    try {
        callSpecmaticCli(['test']);
        const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);

        // Should only include JVM args before the comment
        expect(mockSpawn.mock.calls[0][1]).toEqual([
            '-Xmx512m',
            '-Dmy.prop=quoted value',
            '-jar',
            path.resolve(specmaticJarPath),
            'test'
        ]);
    } finally {
        if (originalJavaOpts !== undefined) {
            process.env.JAVA_OPTS = originalJavaOpts;
        } else {
            delete process.env.JAVA_OPTS;
        }
    }
});

test('handles empty JAVA_OPTS', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const originalJavaOpts = process.env.JAVA_OPTS;
    process.env.JAVA_OPTS = '';

    try {
        callSpecmaticCli(['test']);
        const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);

        // Should only include the jar and test args (no JVM args)
        expect(mockSpawn.mock.calls[0][1]).toEqual([
            '-jar',
            path.resolve(specmaticJarPath),
            'test'
        ]);
    } finally {
        if (originalJavaOpts !== undefined) {
            process.env.JAVA_OPTS = originalJavaOpts;
        } else {
            delete process.env.JAVA_OPTS;
        }
    }
});

test('runs mcp server directly with inherited stdio', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const originalExecutor = process.env.SPECMATIC_EXECUTOR;
    delete process.env.SPECMATIC_EXECUTOR;

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
        callSpecmaticCli(['mcp', 'server']);
        const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);

        expect(mockSpawn.mock.calls[0][0]).toBe('java');
        expect(mockSpawn.mock.calls[0][1]).toEqual(['-jar', path.resolve(specmaticJarPath), 'mcp', 'server']);
        expect(mockSpawn.mock.calls[0][2]).toMatchObject({
            stdio: 'inherit',
            shell: false,
            env: expect.objectContaining({
                SPECMATIC_EXECUTOR: 'npm',
            }),
        });
        expect(consoleLogSpy).not.toHaveBeenCalled();
    } finally {
        consoleLogSpy.mockRestore();
        if (originalExecutor !== undefined) {
            process.env.SPECMATIC_EXECUTOR = originalExecutor;
        } else {
            delete process.env.SPECMATIC_EXECUTOR;
        }
    }
});

test('runs mcp server directly when a root flag appears before it', async () => {
    mockSpawn.mockReturnValue(javaProcessMock);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
        callSpecmaticCli(['--verbose', 'mcp', 'server']);
        const specmaticJarPath = path.resolve(__dirname, '..', '..', '..', specmaticCoreJarName);

        expect(mockSpawn.mock.calls[0][0]).toBe('java');
        expect(mockSpawn.mock.calls[0][1]).toEqual(['-jar', path.resolve(specmaticJarPath), '--verbose', 'mcp', 'server']);
        expect(mockSpawn.mock.calls[0][2]).toMatchObject({
            stdio: 'inherit',
            shell: false,
        });
        expect(consoleLogSpy).not.toHaveBeenCalled();
    } finally {
        consoleLogSpy.mockRestore();
    }
});
