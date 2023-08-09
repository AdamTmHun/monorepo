import * as path from 'node:path';

import { runTests } from '@vscode/test-electron';

async function test() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite.cjs');

    // If the first argument is a path to a file/folder/workspace, the launched VS Code instance
    // will open it.
    const launchArgs = [path.resolve(__dirname, '../../starters/inlang-nextjs')];

    // Download VS Code, unzip it and run the integration test
    await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs });
  } catch (err) {
    console.error(err);
    console.error('Failed to run tests');
    process.exit(1);
  }
}

test();
