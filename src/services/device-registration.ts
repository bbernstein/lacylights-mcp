/**
 * Device authentication startup check and auto-registration.
 *
 * Backend contract (lacylights-go `checkDevice`, schema enum
 * `DeviceStatus = PENDING | APPROVED | REVOKED`):
 *
 * | status   | device   | meaning                                         |
 * |----------|----------|-------------------------------------------------|
 * | APPROVED | null     | auth or device auth disabled, checks bypassed   |
 * | APPROVED | present  | device approved                                 |
 * | PENDING  | null     | fingerprint never seen, client should register  |
 * | PENDING  | present  | registered, waiting for admin approval          |
 * | REVOKED  | present  | device access revoked                           |
 *
 * There is no UNKNOWN / UNREGISTERED status: `device == null` is the only
 * signal that tells "not registered" apart from "registered, awaiting
 * approval" (see bbernstein/lacylights-mcp#206).
 */
import {
  AuthSettings,
  DeviceCheckResult,
  DeviceNotApprovedError,
  DeviceRegistrationResult,
} from './graphql-client-simple';
import { redactFingerprint } from '../utils/device-fingerprint';

/** What the MCP server should do with a `checkDevice` result. */
export type DeviceAction = 'proceed' | 'register' | 'await-approval' | 'revoked';

/** Final outcome of {@link checkDeviceStatus}, mainly for tests and callers that care. */
export type DeviceStatusOutcome =
  | 'no-fingerprint'
  | 'auth-disabled'
  | 'device-auth-disabled'
  | 'approved'
  | 'pending-approval'
  | 'registered'
  | 'registration-failed'
  | 'revoked'
  | 'not-approved'
  | 'check-failed';

/** The subset of the GraphQL client used by the device check. */
export interface DeviceAuthClient {
  getAuthSettings(options?: { signal?: AbortSignal }): Promise<AuthSettings>;
  checkDevice(fingerprint: string, options?: { signal?: AbortSignal }): Promise<DeviceCheckResult>;
  registerDevice(
    fingerprint: string,
    name: string,
    options?: { signal?: AbortSignal }
  ): Promise<DeviceRegistrationResult>;
}

/** The subset of the logger used by the device check. */
export interface DeviceAuthLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

/** Default timeout for the whole startup device check (settings + check + register). */
export const DEVICE_CHECK_TIMEOUT_MS = 5000;

/**
 * Decide what to do with a `checkDevice` result.
 *
 * The status is typed loosely on purpose: the backend enum has no UNKNOWN, but
 * an older or different backend could send a value we don't know. Any such
 * value falls back to registering, as before this fix. That is safe because the
 * backend's `registerDevice` is idempotent: for an existing fingerprint it
 * returns the existing record and creates nothing.
 */
export function decideDeviceAction(result: { status: string; device?: unknown }): DeviceAction {
  switch (result.status) {
    case 'APPROVED':
      return 'proceed';
    case 'REVOKED':
      return 'revoked';
    case 'PENDING':
      // PENDING + null device = fingerprint not registered yet.
      return result.device === null || result.device === undefined ? 'register' : 'await-approval';
    default:
      // Legacy 'UNKNOWN' or any unexpected status.
      return 'register';
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function registerThisDevice(
  client: DeviceAuthClient,
  log: DeviceAuthLogger,
  fingerprint: string,
  deviceName: string,
  signal: AbortSignal
): Promise<DeviceStatusOutcome> {
  log.info('Registering new device...', { deviceName, fingerprint: redactFingerprint(fingerprint) });
  try {
    const regResult = await client.registerDevice(fingerprint, deviceName, { signal });
    if (!regResult.success) {
      log.error('Device registration failed', { message: regResult.message });
      return 'registration-failed';
    }
    log.info('Device registered successfully', {
      deviceId: regResult.device?.id,
      message: regResult.message,
    });
    log.warn('Device pending approval', {
      message: 'Please approve this device in the LacyLights admin panel.',
      deviceName,
      fingerprint: redactFingerprint(fingerprint),
    });
    return 'registered';
  } catch (regError) {
    if (isAbortError(regError)) {
      log.error('Device registration timed out', {
        error: 'Device authentication check timed out',
      });
    } else {
      log.error('Failed to register device', { error: errorText(regError) });
    }
    return 'registration-failed';
  }
}

/**
 * Check device authentication status with the backend at startup, and
 * auto-register this device if the backend does not know it.
 *
 * - Auth or device auth disabled: logs and continues.
 * - APPROVED: logs and continues.
 * - PENDING with a device record: logs that it is waiting for approval (no re-register).
 * - PENDING with no device record (unregistered): registers once, then logs pending approval.
 * - REVOKED: logs an error and continues (the backend rejects requests).
 * - Connection errors / timeout: logs a warning and continues (allows offline use).
 *
 * Never throws. Called once per process from server startup, so registration
 * happens at most once per process.
 */
export async function checkDeviceStatus(
  client: DeviceAuthClient,
  log: DeviceAuthLogger,
  fingerprint: string | null,
  deviceName: string,
  options: { timeoutMs?: number } = {}
): Promise<DeviceStatusOutcome> {
  if (!fingerprint) {
    log.warn('No device fingerprint available, skipping device authentication check');
    return 'no-fingerprint';
  }

  // Abort hung requests (not just ignore them) so startup is never blocked indefinitely.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEVICE_CHECK_TIMEOUT_MS);
  const { signal } = controller;

  try {
    const authSettings = await client.getAuthSettings({ signal });

    if (!authSettings.authEnabled) {
      log.info('Authentication disabled on server - all access allowed');
      return 'auth-disabled';
    }

    if (!authSettings.deviceAuthEnabled) {
      log.info('Device authentication disabled - using standard authentication');
      return 'device-auth-disabled';
    }

    log.info('Device authentication enabled, checking device status...');

    const result = await client.checkDevice(fingerprint, { signal });

    switch (decideDeviceAction(result)) {
      case 'proceed':
        log.info('Device approved', {
          deviceId: result.device?.id,
          deviceName: result.device?.name,
          permissions: result.device?.permissions,
        });
        return 'approved';

      case 'await-approval':
        log.warn('Device is pending approval', {
          message: 'Please approve this device in the LacyLights admin panel.',
          deviceName,
          fingerprint: redactFingerprint(fingerprint),
        });
        return 'pending-approval';

      case 'revoked':
        log.error('Device has been revoked', {
          message: 'This device has been revoked and cannot access the system.',
          fingerprint: redactFingerprint(fingerprint),
        });
        // Continue anyway - the backend will reject requests
        return 'revoked';

      case 'register':
        if (result.message) {
          log.info('Backend reports device is not registered', { message: result.message });
        }
        return await registerThisDevice(client, log, fingerprint, deviceName, signal);
    }
  } catch (error) {
    if (error instanceof DeviceNotApprovedError) {
      log.error('Device not approved to access the system', {
        message: 'Please approve this device in the LacyLights admin panel.',
        fingerprint: redactFingerprint(error.fingerprint),
        deviceName,
      });
      // Continue anyway - the MCP server can still start, requests will fail
      return 'not-approved';
    }

    // Connection error, timeout, or other issue - log and continue so the MCP
    // server can start even if the backend is temporarily unavailable.
    log.warn('Could not check device authentication status', {
      error: isAbortError(error) ? 'Device authentication check timed out' : errorText(error),
      message: 'Continuing without device verification. Backend may be unavailable.',
    });
    return 'check-failed';
  } finally {
    clearTimeout(timeoutId);
  }
}
