#!/usr/bin/env node
/**
 * Test runner script that handles Node.js version compatibility.
 *
 * Node.js 25+ requires the --localstorage-file flag for localStorage security,
 * but this flag doesn't exist in older Node versions.
 * This script detects the Node version and adds the flag only when needed.
 */

const { spawn } = require('child_process');
const path = require('path');

const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
const args = process.argv.slice(2);

// Build the jest command arguments
const jestPath = path.join(__dirname, '..', 'node_modules', '.bin', 'jest');
const nodeArgs = [];

// Add --localstorage-file flag for Node.js 25+
if (nodeVersion >= 25) {
  nodeArgs.push('--localstorage-file=/tmp/jest-localstorage.txt');
}

// Add jest path and any additional arguments
nodeArgs.push(jestPath, ...args);

// Spawn node with the constructed arguments
const child = spawn('node', nodeArgs, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
