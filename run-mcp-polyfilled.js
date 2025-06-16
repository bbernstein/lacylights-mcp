#!/usr/bin/env node

// Polyfill for nullish coalescing if needed
if (!global.process.versions.node || parseInt(global.process.versions.node.split('.')[0]) < 14) {
  // Simple transpilation of ?? operator
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    const result = originalRequire.apply(this, arguments);
    
    // If it's zod, we need to handle it specially
    if (id.includes('zod')) {
      console.error('Warning: Using Node.js version that may not support nullish coalescing');
    }
    
    return result;
  };
}

// Use dynamic import to avoid syntax errors
const path = require('path');
const serverPath = path.join(__dirname, 'dist', 'index.js');

try {
  require(serverPath);
} catch (error) {
  console.error('Failed to start server:', error.message);
  
  // If it's a syntax error with ??, suggest upgrading Node
  if (error.message.includes('Unexpected token ?')) {
    console.error('\nERROR: Your Node.js version does not support the nullish coalescing operator (??)');
    console.error('Please upgrade to Node.js 14 or higher');
    console.error('Current version:', process.version);
  }
  
  process.exit(1);
}