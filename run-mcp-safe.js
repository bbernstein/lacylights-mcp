#!/usr/bin/env node

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

console.error(`Node.js version: ${nodeVersion}`);

if (majorVersion < 14) {
  console.error('ERROR: Node.js version 14 or higher is required for this MCP server');
  console.error('The nullish coalescing operator (??) requires Node.js 14+');
  process.exit(1);
}

// Load the server
try {
  require('./dist/index.js');
} catch (error) {
  console.error('Failed to start MCP server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}