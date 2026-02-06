import * as path from 'path';
import * as os from 'os';

// Mock node-machine-id before importing
jest.mock('node-machine-id', () => ({
  machineIdSync: jest.fn(),
}));

// Mock fs module for file operations
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  renameSync: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import * as fs from 'fs';
import { machineIdSync } from 'node-machine-id';
import {
  getDeviceFingerprint,
  getDeviceName,
  clearCachedFingerprint,
} from '../../src/utils/device-fingerprint';
import { logger } from '../../src/utils/logger';

const mockMachineIdSync = machineIdSync as jest.MockedFunction<typeof machineIdSync>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Device Fingerprint Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fs mocks to default behavior
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.unlinkSync.mockImplementation(() => {});
  });

  describe('getDeviceFingerprint', () => {
    it('should return cached fingerprint if it exists', () => {
      const cachedFingerprint = 'cached-fingerprint-12345';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(cachedFingerprint);

      const result = getDeviceFingerprint();

      expect(result).toBe(cachedFingerprint);
      expect(mockMachineIdSync).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Using cached device fingerprint',
        expect.any(Object)
      );
    });

    it('should generate fingerprint from machineIdSync when no cache exists', () => {
      const machineId = 'machine-id-abc123';
      mockFs.existsSync.mockReturnValue(false);
      mockMachineIdSync.mockReturnValue(machineId);

      const result = getDeviceFingerprint();

      expect(result).toBe(machineId);
      expect(mockMachineIdSync).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Generated fingerprint from machine ID');
    });

    it('should cache the generated fingerprint with atomic write', () => {
      const machineId = 'machine-id-xyz789';
      mockFs.existsSync.mockReturnValue(false);
      mockMachineIdSync.mockReturnValue(machineId);

      getDeviceFingerprint();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.lacylights'),
        { recursive: true, mode: 0o700 }
      );
      // Should write to temp file first (atomic write pattern)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('device-id.tmp'),
        machineId,
        { encoding: 'utf-8', mode: 0o600, flag: 'w' }
      );
      // Should rename temp file to final location
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should use fallback when machineIdSync fails', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockMachineIdSync.mockImplementation(() => {
        throw new Error('Machine ID not available');
      });

      const result = getDeviceFingerprint();

      // Result should be a SHA-256 hash (64 hex chars, truncated to 32)
      expect(result).toHaveLength(32);
      expect(result).toMatch(/^[a-f0-9]+$/);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get machine ID, using fallback',
        expect.any(Object)
      );
    });

    it('should ignore empty cached fingerprint', () => {
      const machineId = 'new-machine-id';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('');
      mockMachineIdSync.mockReturnValue(machineId);

      const result = getDeviceFingerprint();

      expect(result).toBe(machineId);
      expect(mockMachineIdSync).toHaveBeenCalled();
    });

    it('should handle cache read errors gracefully', () => {
      const machineId = 'fallback-machine-id';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockMachineIdSync.mockReturnValue(machineId);

      const result = getDeviceFingerprint();

      expect(result).toBe(machineId);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to read cached device fingerprint',
        expect.any(Object)
      );
    });

    it('should handle cache write errors gracefully', () => {
      const machineId = 'new-machine-id';
      mockFs.existsSync.mockReturnValue(false);
      mockMachineIdSync.mockReturnValue(machineId);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      const result = getDeviceFingerprint();

      // Should still return the fingerprint even if caching fails
      expect(result).toBe(machineId);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to cache device fingerprint',
        expect.any(Object)
      );
    });
  });

  describe('getDeviceName', () => {
    it('should return hostname with MCP suffix', () => {
      // Just test that it returns hostname + (MCP) suffix
      // We can't easily mock os.hostname(), but we can verify the format
      const result = getDeviceName();

      expect(result).toMatch(/\(MCP\)$/);
      expect(result).toBe(`${os.hostname()} (MCP)`);
    });

    it('should include the actual hostname', () => {
      const result = getDeviceName();
      const hostname = os.hostname();

      expect(result).toContain(hostname);
    });
  });

  describe('clearCachedFingerprint', () => {
    it('should delete the cached fingerprint file', () => {
      mockFs.existsSync.mockReturnValue(true);

      clearCachedFingerprint();

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('device-id')
      );
      expect(logger.info).toHaveBeenCalledWith('Cleared cached device fingerprint');
    });

    it('should do nothing if no cache file exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      clearCachedFingerprint();

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      clearCachedFingerprint();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clear cached device fingerprint',
        expect.any(Object)
      );
    });
  });

  describe('file path', () => {
    it('should use ~/.lacylights/device-id for cache with restrictive permissions', () => {
      const machineId = 'test-machine-id';
      mockFs.existsSync.mockReturnValue(false);
      mockMachineIdSync.mockReturnValue(machineId);

      getDeviceFingerprint();

      const expectedDir = path.join(os.homedir(), '.lacylights');
      // Directory should be created with mode 0700 (owner-only access)
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true, mode: 0o700 });

      // Temp file should be written with mode 0600 (owner read/write only)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('device-id.tmp'),
        machineId,
        { encoding: 'utf-8', mode: 0o600, flag: 'w' }
      );

      // File should be atomically renamed to final location
      const expectedPath = path.join(expectedDir, 'device-id');
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        expect.stringContaining('device-id.tmp'),
        expectedPath
      );
    });
  });
});
