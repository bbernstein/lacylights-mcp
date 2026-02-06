/**
 * Device Fingerprint Utility
 *
 * Generates and caches a stable device fingerprint for device authentication.
 * Uses node-machine-id as primary source, with fallback to hostname/username hash.
 *
 * The fingerprint is cached in ~/.lacylights/device-id to ensure stability
 * across restarts.
 */

import { machineIdSync } from 'node-machine-id';
import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const FINGERPRINT_FILE = path.join(os.homedir(), '.lacylights', 'device-id');

/**
 * Get or generate a stable device fingerprint.
 *
 * Priority:
 * 1. Return cached fingerprint from ~/.lacylights/device-id if it exists
 * 2. Use machineIdSync() from node-machine-id (most stable)
 * 3. Fall back to hash of hostname + username
 *
 * The fingerprint is cached to ensure stability across restarts.
 *
 * @returns Device fingerprint string
 */
export function getDeviceFingerprint(): string {
  // Try cached fingerprint first
  try {
    if (fs.existsSync(FINGERPRINT_FILE)) {
      const cached = fs.readFileSync(FINGERPRINT_FILE, 'utf-8').trim();
      if (cached && cached.length > 0) {
        logger.debug('Using cached device fingerprint', { length: cached.length });
        return cached;
      }
    }
  } catch (error) {
    logger.warn('Failed to read cached device fingerprint', { error });
  }

  // Generate new fingerprint
  let fingerprint: string;
  try {
    // Primary: OS machine ID (very stable)
    // macOS: IOPlatformUUID from IOKit
    // Linux: /etc/machine-id
    // Windows: MachineGuid from registry
    fingerprint = machineIdSync();
    logger.debug('Generated fingerprint from machine ID');
  } catch (error) {
    // Fallback: hash of hostname + username
    logger.warn('Failed to get machine ID, using fallback', { error });
    let username = 'unknown';
    try {
      username = os.userInfo().username;
    } catch (userError) {
      logger.warn('Failed to get OS user info for fingerprint, falling back to hostname-only', { error: userError });
    }
    const data = `${os.hostname()}-${username}-lacylights-mcp`;
    fingerprint = crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
    logger.debug('Generated fingerprint from hostname/username hash');
  }

  // Cache it with restrictive permissions using atomic write pattern
  try {
    const dir = path.dirname(FINGERPRINT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    // Atomic write: write to temp file then rename to avoid partial writes
    const tempFile = `${FINGERPRINT_FILE}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempFile, fingerprint, { encoding: 'utf-8', mode: 0o600, flag: 'w' });
    try {
      fs.renameSync(tempFile, FINGERPRINT_FILE);
    } catch (renameError: unknown) {
      // On Windows, renameSync can fail if destination exists (EEXIST/EPERM)
      // Retry after unlinking the destination file
      const errnoError = renameError as NodeJS.ErrnoException;
      const isWindowsConflict = errnoError.code === 'EEXIST' || errnoError.code === 'EPERM';
      if (isWindowsConflict) {
        try {
          fs.unlinkSync(FINGERPRINT_FILE);
          fs.renameSync(tempFile, FINGERPRINT_FILE);
        } catch (_retryError) {
          // Fallback to non-atomic overwrite
          fs.writeFileSync(FINGERPRINT_FILE, fingerprint, { encoding: 'utf-8', mode: 0o600 });
          // Clean up temp file
          try { fs.unlinkSync(tempFile); } catch { /* ignore cleanup errors */ }
        }
      } else {
        // Non-Windows error or different issue - clean up temp file and rethrow
        try { fs.unlinkSync(tempFile); } catch { /* ignore cleanup errors */ }
        throw renameError;
      }
    }
    logger.debug('Cached device fingerprint', { path: FINGERPRINT_FILE });
  } catch (error) {
    logger.warn('Failed to cache device fingerprint', { error });
    // Continue without caching - we can still use the fingerprint
  }

  return fingerprint;
}

/**
 * Get a human-readable device name for registration.
 * Format: "{hostname} (MCP)"
 *
 * @returns Device name string
 */
export function getDeviceName(): string {
  return `${os.hostname()} (MCP)`;
}

/**
 * Clear the cached device fingerprint.
 * Useful for testing or when the device identity needs to be reset.
 */
export function clearCachedFingerprint(): void {
  try {
    if (fs.existsSync(FINGERPRINT_FILE)) {
      fs.unlinkSync(FINGERPRINT_FILE);
      logger.info('Cleared cached device fingerprint');
    }
  } catch (error) {
    logger.warn('Failed to clear cached device fingerprint', { error });
  }
}
