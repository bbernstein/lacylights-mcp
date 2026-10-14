import {
  decideDeviceAction,
  checkDeviceStatus,
  DeviceAuthClient,
  DeviceAuthLogger,
} from '../../src/services/device-registration';
import { DeviceNotApprovedError } from '../../src/services/graphql-client-simple';

const FINGERPRINT = 'abcdef0123456789abcdef';
const DEVICE_NAME = 'Test MCP Host';

const pendingDevice = {
  id: 'device-1',
  name: DEVICE_NAME,
  fingerprint: FINGERPRINT,
  status: 'PENDING' as const,
  permissions: 'READ_ONLY',
  lastSeenAt: null,
  createdAt: '2026-01-01T00:00:00Z',
};

function makeClient(overrides: Partial<Record<keyof DeviceAuthClient, jest.Mock>> = {}) {
  const client = {
    getAuthSettings: jest.fn().mockResolvedValue({ authEnabled: true, deviceAuthEnabled: true }),
    checkDevice: jest.fn(),
    registerDevice: jest.fn(),
    ...overrides,
  };
  return client as typeof client & DeviceAuthClient;
}

function makeLogger() {
  const log = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return log as typeof log & DeviceAuthLogger;
}

/** All messages logged at a level, in order. */
function messages(mock: jest.Mock): string[] {
  return mock.mock.calls.map((c) => c[0]);
}

describe('decideDeviceAction', () => {
  it('registers when the backend reports PENDING with a null device (unregistered fingerprint)', () => {
    // This is the exact shape lacylights-go checkDevice returns for a fingerprint it
    // has never seen: {status: PENDING, device: null}.
    expect(decideDeviceAction({ status: 'PENDING', device: null })).toBe('register');
  });

  it('registers when PENDING and the device field is absent', () => {
    expect(decideDeviceAction({ status: 'PENDING' })).toBe('register');
  });

  it('waits for approval when PENDING with a device record', () => {
    expect(decideDeviceAction({ status: 'PENDING', device: pendingDevice })).toBe('await-approval');
  });

  it('proceeds when APPROVED with a device record', () => {
    expect(
      decideDeviceAction({ status: 'APPROVED', device: { ...pendingDevice, status: 'APPROVED' } })
    ).toBe('proceed');
  });

  it('proceeds when APPROVED with a null device (auth/device auth bypassed on backend)', () => {
    expect(decideDeviceAction({ status: 'APPROVED', device: null })).toBe('proceed');
  });

  it('reports revoked when REVOKED', () => {
    expect(
      decideDeviceAction({ status: 'REVOKED', device: { ...pendingDevice, status: 'REVOKED' } })
    ).toBe('revoked');
  });

  it('registers on a legacy UNKNOWN status (not in the backend enum, tolerated for safety)', () => {
    expect(decideDeviceAction({ status: 'UNKNOWN', device: null })).toBe('register');
  });

  it('registers on any other unexpected status', () => {
    expect(decideDeviceAction({ status: 'SOMETHING_NEW', device: null })).toBe('register');
  });
});

describe('checkDeviceStatus', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('skips the check when there is no fingerprint', async () => {
    const client = makeClient();
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, null, DEVICE_NAME);

    expect(outcome).toBe('no-fingerprint');
    expect(client.getAuthSettings).not.toHaveBeenCalled();
    expect(messages(log.warn)).toContain(
      'No device fingerprint available, skipping device authentication check'
    );
  });

  it('skips the device check when authentication is disabled', async () => {
    const client = makeClient({
      getAuthSettings: jest.fn().mockResolvedValue({ authEnabled: false, deviceAuthEnabled: false }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('auth-disabled');
    expect(client.checkDevice).not.toHaveBeenCalled();
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(messages(log.info)).toContain('Authentication disabled on server - all access allowed');
  });

  it('skips the device check when device authentication is disabled', async () => {
    const client = makeClient({
      getAuthSettings: jest.fn().mockResolvedValue({ authEnabled: true, deviceAuthEnabled: false }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('device-auth-disabled');
    expect(client.checkDevice).not.toHaveBeenCalled();
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(messages(log.info)).toContain('Device authentication disabled - using standard authentication');
  });

  it('auto-registers an unregistered device (PENDING with null device) exactly once', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'PENDING',
        device: null,
        message: 'Device not registered - please register this device',
      }),
      registerDevice: jest.fn().mockResolvedValue({
        success: true,
        device: { id: 'device-1', name: DEVICE_NAME, fingerprint: FINGERPRINT, status: 'PENDING' },
        message: 'Device registered successfully. Please wait for admin approval.',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registered');
    expect(client.registerDevice).toHaveBeenCalledTimes(1);
    expect(client.registerDevice).toHaveBeenCalledWith(
      FINGERPRINT,
      DEVICE_NAME,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(messages(log.info)).toEqual(
      expect.arrayContaining(['Registering new device...', 'Device registered successfully'])
    );
    expect(messages(log.warn)).toContain('Device pending approval');
    expect(messages(log.warn)).not.toContain('Device is pending approval');
    // The full fingerprint must never be logged.
    expect(JSON.stringify(log.info.mock.calls)).not.toContain(FINGERPRINT);
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain(FINGERPRINT);
  });

  it('does not re-register a device that is registered and pending approval', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'PENDING',
        device: pendingDevice,
        message: 'Device is pending approval',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('pending-approval');
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(messages(log.warn)).toContain('Device is pending approval');
  });

  it('logs approval and does not register when APPROVED', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'APPROVED',
        device: { ...pendingDevice, status: 'APPROVED', permissions: 'FULL' },
        message: 'Device is approved',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('approved');
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      'Device approved',
      expect.objectContaining({ deviceId: 'device-1', permissions: 'FULL' })
    );
  });

  it('does not register when APPROVED with a null device', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'APPROVED', device: null, message: null }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('approved');
    expect(client.registerDevice).not.toHaveBeenCalled();
  });

  it('logs an error and does not register when REVOKED', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'REVOKED',
        device: { ...pendingDevice, status: 'REVOKED' },
        message: 'Device access has been revoked',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('revoked');
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(messages(log.error)).toContain('Device has been revoked');
  });

  it('registers on a legacy UNKNOWN status', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'UNKNOWN', device: null }),
      registerDevice: jest.fn().mockResolvedValue({ success: true, device: null, message: 'ok' }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registered');
    expect(client.registerDevice).toHaveBeenCalledTimes(1);
  });

  it('warns about an unexpected status (naming it) before falling back to registration', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'SOMETHING_NEW',
        device: null,
        message: 'Some other backend message',
      }),
      registerDevice: jest.fn().mockResolvedValue({ success: true, device: null, message: 'ok' }),
    });
    const log = makeLogger();

    await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(log.warn).toHaveBeenCalledWith(
      'Unexpected device status from backend, attempting registration',
      expect.objectContaining({ status: 'SOMETHING_NEW', message: 'Some other backend message' })
    );
    expect(messages(log.info)).not.toContain('Backend reports device is not registered');
  });

  it('logs the backend "not registered" message for an unregistered device', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({
        status: 'PENDING',
        device: null,
        message: 'Device not registered - please register this device',
      }),
      registerDevice: jest.fn().mockResolvedValue({
        success: true,
        device: { id: 'device-1', name: DEVICE_NAME, fingerprint: FINGERPRINT, status: 'PENDING' },
        message: 'Device registered successfully. Please wait for admin approval.',
      }),
    });
    const log = makeLogger();

    await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(log.info).toHaveBeenCalledWith('Backend reports device is not registered', {
      message: 'Device not registered - please register this device',
    });
    expect(messages(log.warn)).not.toContain(
      'Unexpected device status from backend, attempting registration'
    );
  });

  it('does not claim pending approval when registerDevice returns an already-approved device', async () => {
    // registerDevice is idempotent: for a fingerprint it already knows (e.g. another
    // process registered it and an admin approved it between our check and register)
    // it returns the existing record with success: true.
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'PENDING', device: null }),
      registerDevice: jest.fn().mockResolvedValue({
        success: true,
        device: { id: 'device-1', name: DEVICE_NAME, fingerprint: FINGERPRINT, status: 'APPROVED' },
        message: 'Device already registered with status: APPROVED',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('approved');
    expect(messages(log.warn)).not.toContain('Device pending approval');
    expect(messages(log.info)).not.toContain('Device registered successfully');
    expect(log.info).toHaveBeenCalledWith(
      'Device already registered and approved',
      expect.objectContaining({ deviceId: 'device-1' })
    );
  });

  it('reports revoked when registerDevice returns an existing revoked device', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'UNKNOWN', device: null }),
      registerDevice: jest.fn().mockResolvedValue({
        success: true,
        device: { id: 'device-1', name: DEVICE_NAME, fingerprint: FINGERPRINT, status: 'REVOKED' },
        message: 'Device already registered with status: REVOKED',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('revoked');
    expect(messages(log.warn)).not.toContain('Device pending approval');
    expect(messages(log.error)).toContain('Device has been revoked');
    expect(JSON.stringify(log.error.mock.calls)).not.toContain(FINGERPRINT);
  });

  it('reports a registration the backend rejected (success: false)', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'PENDING', device: null }),
      registerDevice: jest.fn().mockResolvedValue({
        success: false,
        device: null,
        message: 'Device authentication is not enabled',
      }),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registration-failed');
    expect(log.error).toHaveBeenCalledWith(
      'Device registration failed',
      expect.objectContaining({ message: 'Device authentication is not enabled' })
    );
  });

  it('logs and continues when registerDevice throws', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'PENDING', device: null }),
      registerDevice: jest.fn().mockRejectedValue(new Error('Network unavailable')),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registration-failed');
    expect(log.error).toHaveBeenCalledWith(
      'Failed to register device',
      expect.objectContaining({ error: 'Network unavailable' })
    );
  });

  it('logs a non-Error rejection from registerDevice', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'PENDING', device: null }),
      registerDevice: jest.fn().mockRejectedValue('boom'),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registration-failed');
    expect(log.error).toHaveBeenCalledWith(
      'Failed to register device',
      expect.objectContaining({ error: 'boom' })
    );
  });

  it('reports a registration timeout when registerDevice is aborted', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const client = makeClient({
      checkDevice: jest.fn().mockResolvedValue({ status: 'PENDING', device: null }),
      registerDevice: jest.fn().mockRejectedValue(abortError),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('registration-failed');
    expect(messages(log.error)).toContain('Device registration timed out');
  });

  it('logs a warning and continues when checkDevice throws', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('check-failed');
    expect(client.registerDevice).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      'Could not check device authentication status',
      expect.objectContaining({ error: 'ECONNREFUSED' })
    );
  });

  it('logs a non-Error rejection from the status check', async () => {
    const client = makeClient({
      getAuthSettings: jest.fn().mockRejectedValue('offline'),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('check-failed');
    expect(log.warn).toHaveBeenCalledWith(
      'Could not check device authentication status',
      expect.objectContaining({ error: 'offline' })
    );
  });

  it('reports a timeout when the status check is aborted', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const client = makeClient({ getAuthSettings: jest.fn().mockRejectedValue(abortError) });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('check-failed');
    expect(log.warn).toHaveBeenCalledWith(
      'Could not check device authentication status',
      expect.objectContaining({ error: 'Device authentication check timed out' })
    );
  });

  it('aborts a hung status check after the timeout', async () => {
    const client = makeClient({
      getAuthSettings: jest.fn().mockImplementation(
        (options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      ),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME, { timeoutMs: 10 });

    expect(outcome).toBe('check-failed');
    expect(log.warn).toHaveBeenCalledWith(
      'Could not check device authentication status',
      expect.objectContaining({ error: 'Device authentication check timed out' })
    );
  });

  it('reports a not-approved device when the client raises DeviceNotApprovedError', async () => {
    const client = makeClient({
      checkDevice: jest.fn().mockRejectedValue(new DeviceNotApprovedError('not approved', FINGERPRINT)),
    });
    const log = makeLogger();

    const outcome = await checkDeviceStatus(client, log, FINGERPRINT, DEVICE_NAME);

    expect(outcome).toBe('not-approved');
    expect(messages(log.error)).toContain('Device not approved to access the system');
    expect(JSON.stringify(log.error.mock.calls)).not.toContain(FINGERPRINT);
  });
});
