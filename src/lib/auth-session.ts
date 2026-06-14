/**
 * Session authentication — Node.js compatible (API routes, server components).
 *
 * Re-exports all Edge-compatible cookie crypto operations from `session-crypto`,
 * and adds server-side session persistence via PrismaClient.
 *
 * Node.js code should import from this module.
 * Edge Runtime code (middleware) should import from `@/lib/session-crypto` directly.
 */

import { db } from '@/lib/db';

// Import session-crypto functions we need locally AND re-export to consumers
import {
  getSessionCookieName,
  getSetupSessionCookieName,
  getSessionCookieOptions,
  verifySessionCookie,
  createSessionCookie,
  createSetupSessionCookie,
  extractTokenFromCookie,
  isProductionEnv,
  getSessionCookieMaxAge,
  getSetupSessionCookieMaxAge,
} from '@/lib/session-crypto';

export type { SessionPayload } from '@/lib/session-crypto';

// Re-export all Edge-compatible crypto operations so consumers can import
// everything from a single module (@/lib/auth-session)
export {
  createSessionCookie,
  createSetupSessionCookie,
  extractTokenFromCookie,
  verifySessionCookie,
  isProductionEnv,
  getSessionCookieName,
  getSetupSessionCookieName,
  getSessionCookieOptions,
  getSessionCookieMaxAge,
  getSetupSessionCookieMaxAge,
} from '@/lib/session-crypto';

// ─── Deprecated aliases ─────────────────────────────────────────────────────

/** @deprecated Use getSessionCookieName() for testability */
export const SESSION_COOKIE_NAME = getSessionCookieName();
/** @deprecated Use getSetupSessionCookieName() for testability */
export const SETUP_SESSION_COOKIE_NAME = getSetupSessionCookieName();
/** @deprecated Use getSessionCookieOptions() for testability */
export const SESSION_COOKIE_OPTIONS = getSessionCookieOptions();

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
