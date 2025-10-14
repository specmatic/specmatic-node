# Specmatic Framework Node Module

![tests](https://github.com/specmatic/specmatic-node/actions/workflows/test.yml/badge.svg)
[![publish](https://github.com/specmatic/specmatic-node/actions/workflows/publish.yml/badge.svg)](https://www.npmjs.com/package/specmatic)
[![release](https://img.shields.io/npm/v/specmatic)](https://github.com/specmatic/specmatic-node/releases/latest)

This node module is a thin wrapper over the [specmatic executable jar](https://specmatic.io/getting_started.html#setup). All core capabilities are in the main [Specmatic project](https://github.com/specmatic/specmatic). The purpose of this wrapper module is to act as a helper with below aspects.

- Easy installation and upgrade of the jar file in node projects through npm
- Global install using npm and easy run specmatic jar executable without having to download the jar file and having to run `java -jar`
- Programmatic access to some of the specmatic options as api like start / stop the stub server, setting expecations, running tests. These helpers methods can be used in a javascript project programmatically instead of using cli scripts.

## Table Of Contents
- [Specmatic Framework Node Module](#specmatic-framework-node-module)
  - [Table Of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [Contract as Stub / Smart Mock (For API clients / consumers)](#contract-as-stub--smart-mock-for-api-clients--consumers)
  - [Contract as Test (For API Providers / Service)](#contract-as-test-for-api-providers--service)
  - [Sample Repo](#sample-repo)
  - [Programmatic Access](#programmatic-access)
    - [Core APIs](#core-apis)
  - [IDE Support](#ide-support)
    - [Jest Framework](#jest-framework)
  - [Logging](#logging)
  - [Environment Variables](#environment-variables)
  - [Known Issues](#known-issues)
    - [1. Node 17/18 - Connection Refused error when connecting to stub](#1-node-1718---connection-refused-error-when-connecting-to-stub)
    - [2. Error "ReferenceError: setImmediate is not defined"](#2-error-referenceerror-setimmediate-is-not-defined)
    - [3. Specmatic stub is not terminated after test execution](#3-specmatic-stub-is-not-terminated-after-test-execution)
    - [4. Test results don't show up in IDE](#4-test-results-dont-show-up-in-ide)
  - [Contribution](#contribution)

## Quick Start

`npm install specmatic` will install the specmatic locally to the node project.

Sample npm scripts to run specmatic, (Check [Documentation](https://specmatic.io/documentation.html) for more information on cli commands and arguments.)

## Contract as Stub / Smart Mock (For API clients / consumers)

In stub mode, Specmatic emulates the Provider / API / Service based on the API Specification so that the consumer / client application can make independent progress. [Learn more](https://specmatic.io/#contract-as-stub).

## Contract as Test (For API Providers / Service)

Tests for Free – Specmatic parses your API Specification files and based on this generates requests which are fired at your application. It then verifies if your application’s response is as per your API Specification. All this with a “No Code” approach.. [Learn More](https://specmatic.io/#contract-as-test)

## Sample Repo

https://github.com/specmatic/specmatic-order-bff-nodejs

## Programmatic Access

Specmatic JS library exposes some of the commands as methods that can be run programmatically from any javascript testing framework, during setup or test phases.

```javascript
import {
    startHttpStub,
    setHttpStubExpectationJson,
    setHttpStubExpectations,
    stopHttpStub,
    test,
    showTestResults,
    printJarVersion,
} from 'specmatic';
```
### Core APIs

`startHttpStub(host?: string, port?: number, args?: (string | number)[]): Promise<Stub>` <br />
Start the stub server. Argument `args` values are passed directly to specmatic jar executable.<br />
*Note: This replaces `startStub` method which is deprecated*

`setHttpStubExpectationJson(stubResponse: any, stubServerBaseUrl?: string): Promise<boolean>` <br />
Set stub expectation from a static JSON object. Stub should be running before invoking this method.<br />

`setHttpStubExpectations(stubPath: string, stubServerBaseUrl?: string): Promise<boolean>` <br />
Set stub expectation from a file. Stub should be running before invoking this method.<br />
*Note: This replaces `setExpectations` method which is deprecated*

`stopHttpStub(stub: Stub)` <br />
Stop the stub server<br />
*Note: This replaces `stopStub` method which is deprecated*

`test(host?: string, port?: string, contractPath?: string, args?: (string | number)[]): Promise<{ [k: string]: number } | undefined>` <br />
Run tests. Argument `args` values are passed directly to specmatic jar executable.

`showTestResults(testFn: (name: string, cb: () => void) => void)` <br />
View test results in any framework so that it shows up in IDE specific test results interface. Refer [IDE Support](#ide-support) below for details on how to use this feature.

`printJarVersion()` <br />
method to print the version of specmatic.jar

`enableApiCoverage(expressAppRef) ` <br />
enable api coverage for express apps to know which apis and http verbs are covered in contract tests and which not

## IDE Support

Specmatic tests can be displayed in IDE specific test result view by using `showTestResults` method coupled with `test` method. Test framework specific steps are below.

### Jest Framework
Example: https://github.com/specmatic/specmatic-order-bff-nodejs/blob/main/test/contract

1. Call `test` method in a [`globalSetup`](https://jestjs.io/docs/configuration#globalsetup-string) script. `globalSetup` script path can be set either in the jest command line argument or in jest configuration file.
2. Call `showTestResults` in the root of your test file anywhere. You can pass `test` method of Jest as its argument and it works out of the box.

*Note 1:* Since you are running test method in a `globalSetup` script, any pre-test setup like starting a stub server, app server and any dependent processes like redis server has to be done in the globalSetup script in required sequence before `test` method is called.

*Note 2:* If your project already has a jest globalSetup and or globalTeardown scripts then reuse them but include the necessary code to make IDE integration work.

*Note 3:* If your project uses jest projects support ([`--projects`](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig)), then configure `globalSetup/globalTeardown` in the project specific jest config file

## Logging

By default only warning and error messages are displayed. You can configure the loglevel in package.json as

```json
"specmatic": {
    "logLevel": "debug"
},
```

logLevel accepts all values supported by [winston logger](https://github.com/winstonjs/winston#logging-levels)

## Environment Variables

Specmatic Node supports several environment variables to customize the Java runtime behavior:

### JAVA_OPTS

You can pass JVM options to the Specmatic Java process using the `JAVA_OPTS` environment variable. The parser supports:
- Quoted arguments with spaces: `JAVA_OPTS='-Xmx1024m -Dmy.prop="value with spaces"'`
- Single and double quotes: `JAVA_OPTS="-Dmy.prop='single quotes' -Dother=\"double quotes\""`
- Escaped characters: `JAVA_OPTS='-Dpath=C:\\Windows\\Temp'`
- Complex expressions with special characters

Example:
```bash
export JAVA_OPTS='-Xmx2048m -Dfile.encoding=UTF-8 -Djava.io.tmpdir="/tmp/specmatic"'
npm run test
```

### Dealing with https proxies

If your network requires the use of a proxy server to access external resources, you may need to configure your proxy settings using `JAVA_OPTS`.

```
export JAVA_OPTS='-Dhttps.proxyHost=proxy.example.com -Dhttps.proxyPort=3128 -Dhttp.proxyHost=proxy.example.com -Dhttp.proxyPort=3128'
npm run
```

## Known Issues

### 1. Node 17/18 - Connection Refused error when connecting to stub

Node 18 apparently shifted to IPv6 as first choice for resolving hostname when both IPv4 and IPv6 addresses are available. This means `localhost` most likely resolves to `::1` rather than `127.0.0.1` or `0.0.0.0`. Now specmatic node wrapper does not start the stub server but the java program under the hood does it and java still resolves to IPv4 address by default. Thus localhost on node v18 and java might resolve to a different address and any connection from node to the running stub will fail. To resolve this, until we have a permanent solution, we request to disable any IPv6 address mapping to a named host in your DNS resolver or `/etc/hosts`.

### 2. Error "ReferenceError: setImmediate is not defined"

This happens due to an issue in Jest framework. The easiest solution is to import `core-js` in the affected test file.

### 3. Specmatic stub is not terminated after test execution

This happens if stub is not stopped in the same way it is started. There can be two possibilities in case of *Jest* framework
1. If started from `before*` methods in a test suite, then it should be stopped using `stopStub` method in corresponding `after*` method
2. If started using `globalSetup` script, then it should be stopped in a `globalTeardown` script

*Note*: If `bail` is set to true in jest config, then any test failure will abort further execution of tests including `after*` methods and `globalTeardown` script. This will prevent stopping your stubs and other processes leaving them hanging and causing port conflicts when tests are run again next.

### 4. Test results don't show up in IDE

We have tested IDE integration with webstorm and jest framework combination. Visual Studio Code seems to work on and off with Jest. Please follow the instructions mentioned in [IDE Support](#ide-support) to set this up.

Any other test framework can easily be also configured to display test results in IDE test results view by passing a convertor function to the `showTestResults` api.

## Contribution

Please refer to this [link](CONTRIBUTING.MD)
