/**
 * Edge Runtime-compatible session cookie crypto operations.
 *
 * This module is safe to import in Next.js Middleware and other Edge contexts.
 * It uses only Web APIs (crypto.subtle, TextEncoder, btoa/atob) and reads the
 * session secret from `process.env.SESSION_SECRET`.
 *
 * In the production Docker setup, the entrypoint script exports the secret
 * (auto-generated from `/app/data/.session-secret`) as `SESSION_SECRET` so
 * it is available to both Node.js and Edge Runtime.
 *
 * Resolution:
 *   1. `process.env.SESSION_SECRET` — must be set before calling any function
 *   2. If not set, the function throws with a clear error message
 *
 * Node.js code (API routes, server components) should import from `@/lib/auth-session`
 * which re-exports these functions and also supports file-based secret resolution.
 */

export interface SessionPayload {
  token: string;
  exp: number;
}

const encoder = new TextEncoder();

/**
 * Resolve the session secret from the environment.
 * Must be called lazily (not at module load time) so that the module
 * can be safely imported in Edge Runtime without a SESSION_SECRET set.
 */
function resolveSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  throw new Error(
    'SESSION_SECRET environment variable is not set. ' +
      'In production Docker, the entrypoint auto-generates and exports it. ' +
      'For manual override: SESSION_SECRET=$(openssl rand -hex 32)',
  );
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(resolveSecret()),
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

/**
 * Create a signed cookie value valid for the given TTL (in milliseconds).
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

/**
 * Verify a session cookie's HMAC signature and expiration.
 * Returns the session token if valid, null otherwise.
 *
 * This does NOT check the database (no PrismaClient dependency).
 * Use verifySessionWithDb() from @/lib/auth-session for full verification.
 */
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

export function getSessionCookieMaxAge(): number {
  return 7 * 24 * 60 * 60;
}

export function getSetupSessionCookieMaxAge(): number {
  return 15 * 60;
}
