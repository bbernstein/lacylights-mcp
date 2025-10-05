import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Simple file-based logger for MCP server debugging
 * Logs are written to ~/.lacylights-mcp/logs/mcp-server.log
 *
 * This is necessary because MCP uses stdio for communication,
 * so console.log/error would interfere with the protocol.
 */
class FileLogger {
  private logFilePath: string;
  private enabled: boolean;

  constructor() {
    // Create logs directory in user's home
    const logsDir = path.join(os.homedir(), '.lacylights-mcp', 'logs');

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      this.logFilePath = path.join(logsDir, 'mcp-server.log');
      this.enabled = true;

      // Log rotation: if file is > 10MB, rename it and start fresh
      try {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > 10 * 1024 * 1024) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const archivePath = path.join(logsDir, `mcp-server-${timestamp}.log`);
          fs.renameSync(this.logFilePath, archivePath);
        }
      } catch {
        // File doesn't exist yet, that's fine
      }

      this.log('info', '=== MCP Server Started ===');
    } catch {
      // If we can't create the log file, disable logging
      this.enabled = false;
      this.logFilePath = '';
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data !== undefined) {
      try {
        formatted += '\n' + JSON.stringify(data, null, 2);
      } catch {
        formatted += '\n[Unable to stringify data]';
      }
    }

    return formatted + '\n';
  }

  private write(message: string): void {
    if (!this.enabled) return;

    try {
      fs.appendFileSync(this.logFilePath, message, 'utf8');
    } catch {
      // If write fails, disable logging to avoid errors
      this.enabled = false;
    }
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    this.write(this.formatMessage(level, message, data));
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  getLogPath(): string {
    return this.logFilePath;
  }
}

// Export singleton instance
export const logger = new FileLogger();
