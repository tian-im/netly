import { db } from '@/lib/db';
import { getSessionSecret } from '@/lib/session-secret';

const encoder = new TextEncoder();

const SECRET = getSessionSecret();

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBuffer(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export interface SessionPayload {
  token: string;
  exp: number;
}

/**
 * Create a signed cookie value valid for the given TTL (in milliseconds).
 * Thin wrapper shared by session and setup-session cookies.
 */
async function createSignedCookie(ttlMs: number): Promise<string> {
  const token = crypto.randomUUID();
  const payload: SessionPayload = { token, exp: Date.now() + ttlMs };
  const json = JSON.stringify(payload);
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(json));
  const payloadBase64 = bufferToBase64(encoder.encode(json));
  const sigBase64 = bufferToBase64(sig);
  return `${payloadBase64}.${sigBase64}`;
}

export async function createSessionCookie(): Promise<string> {
  return createSignedCookie(7 * 24 * 60 * 60 * 1000);
}

export async function createSetupSessionCookie(): Promise<string> {
  return createSignedCookie(15 * 60 * 1000);
}

/**
 * Extract the token from a signed cookie payload without verifying the signature.
 * Useful when you just created the cookie and need the raw token for DB storage.
 *
 * @internal — This function extracts the payload without HMAC verification.
 * Only call it immediately after createSessionCookie() or createSetupSessionCookie()
 * when you already trust the cookie value. Do NOT use this to verify session
 * authenticity; use verifySessionCookie() or verifySessionWithDb() instead.
 */
export function extractTokenFromCookie(cookieValue: string): string | null {
  try {
    const [payloadBase64] = cookieValue.split('.');
    if (!payloadBase64) return null;
    const json = new TextDecoder().decode(base64ToBuffer(payloadBase64));
    const payload: SessionPayload = JSON.parse(json);
    return payload.token;
  } catch {
    return null;
  }
}

export async function verifySessionCookie(cookieValue: string): Promise<string | null> {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, sigBase64] = parts;

  try {
    const key = await getKey();
    const sigBuffer = base64ToBuffer(sigBase64);
    const payloadBuffer = base64ToBuffer(payloadBase64);
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer as any, payloadBuffer as any);
    if (!valid) return null;

    const json = new TextDecoder().decode(payloadBuffer);
    const payload: SessionPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;

    return payload.token;
  } catch {
    return null;
  }
}

// Use __Host- prefix in production for enhanced security (forces Secure + Path=/).
// In development, omit the prefix because __Host- requires Secure=true (HTTPS only).
export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getSessionCookieName(): string {
  return isProductionEnv() ? '__Host-netly_session' : 'netly_session';
}

export function getSetupSessionCookieName(): string {
  return isProductionEnv() ? '__Host-netly_setup_session' : 'netly_setup_session';
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
} {
  return {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** @deprecated Use getSessionCookieName() for testability */
export const SESSION_COOKIE_NAME = getSessionCookieName();
/** @deprecated Use getSetupSessionCookieName() for testability */
export const SETUP_SESSION_COOKIE_NAME = getSetupSessionCookieName();
/** @deprecated Use getSessionCookieOptions() for testability */
export const SESSION_COOKIE_OPTIONS = getSessionCookieOptions();

export function getSessionCookieMaxAge(): number {
  return 7 * 24 * 60 * 60;
}

export function getSetupSessionCookieMaxAge(): number {
  return 15 * 60;
}

// ─── Server-side session persistence ────────────────────────────────────────

/** Persist a session token to the database for server-side revocation. */
export async function createSessionRecord(token: string): Promise<void> {
  await db.session.upsert({
    where: { token },
    update: {}, // no-op if exists (shouldn't happen with UUIDs)
    create: {
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Delete expired session records from the database.
 * Call this periodically (e.g., on a cron schedule or at startup)
 * to prevent unbounded growth of the Session table.
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/** Remove a session record (used on logout). */
export async function deleteSessionRecord(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}

/** Check whether a session token exists in the database (not revoked). */
export async function sessionRecordExists(token: string): Promise<boolean> {
  const count = await db.session.count({ where: { token } });
  return count > 0;
}

/**
 * Verify a session cookie AND check it exists in the database (not revoked).
 * Returns the session token if valid, null otherwise.
 */
export async function verifySessionWithDb(cookieValue: string): Promise<string | null> {
  const token = await verifySessionCookie(cookieValue);
  if (!token) return null;
  const exists = await sessionRecordExists(token);
  if (!exists) return null;
  return token;
}
