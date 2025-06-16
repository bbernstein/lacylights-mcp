const fs = require('fs');
const path = require('path');

class DebugLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'mcp-debug.log');
    // Clear log on startup
    fs.writeFileSync(this.logFile, `=== MCP Debug Log Started: ${new Date().toISOString()} ===\n`);
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(this.logFile, logEntry);
  }

  debug(message, data) { this.log('DEBUG', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
}

module.exports = new DebugLogger();