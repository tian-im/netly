// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db to prevent Prisma initialization in unit test environment
vi.mock('@/lib/db', () => ({
  db: {
    session: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import {
  createSessionCookie,
  verifySessionCookie,
  verifySessionWithDb,
  extractTokenFromCookie,
  createSessionRecord,
  deleteSessionRecord,
  sessionRecordExists,
  cleanupExpiredSessions,
  SESSION_COOKIE_NAME,
  createSetupSessionCookie,
  SETUP_SESSION_COOKIE_NAME,
  isProductionEnv,
  getSessionCookieName,
  getSetupSessionCookieName,
  getSessionCookieOptions,
  getSessionCookieMaxAge,
  getSetupSessionCookieMaxAge,
} from './auth-session';

import { db } from './db';

describe('auth-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSessionCookie / verifySessionCookie', () => {
    it('creates and verifies a valid session cookie', async () => {
      const cookie = await createSessionCookie();
      expect(cookie).toContain('.');
      const token = await verifySessionCookie(cookie);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('returns null for malformed cookie', async () => {
      expect(await verifySessionCookie('invalid')).toBeNull();
      expect(await verifySessionCookie('too.many.dots')).toBeNull();
      expect(await verifySessionCookie('')).toBeNull();
    });

    it('returns null for cookie with invalid base64 signature', async () => {
      const cookie = await createSessionCookie();
      const [payload] = cookie.split('.');
      const tampered = `${payload}.not-valid-base64!!!`;
      expect(await verifySessionCookie(tampered)).toBeNull();
    });

    it('returns null for cookie with wrong HMAC signature', async () => {
      const cookie = await createSessionCookie();
      const [payload] = cookie.split('.');
      const fakeSig = btoa(String.fromCharCode(...new Uint8Array(32).fill(0)));
      const tampered = `${payload}.${fakeSig}`;
      expect(await verifySessionCookie(tampered)).toBeNull();
    });

    it('returns null for expired cookie', async () => {
      const cookie = await createSessionCookie();

      const originalNow = Date.now;
      global.Date.now = () => originalNow() + 8 * 24 * 60 * 60 * 1000;

      expect(await verifySessionCookie(cookie)).toBeNull();

      global.Date.now = originalNow;
    });
  });

  describe('extractTokenFromCookie', () => {
    it('extracts the token from a valid signed cookie', async () => {
      const cookie = await createSessionCookie();
      const token = extractTokenFromCookie(cookie);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('extracts the same token that verifySessionCookie returns', async () => {
      const cookie = await createSessionCookie();
      const extracted = extractTokenFromCookie(cookie);
      const verified = await verifySessionCookie(cookie);
      expect(extracted).toBe(verified);
    });

    it('returns null for invalid cookie format', () => {
      expect(extractTokenFromCookie('')).toBeNull();
      expect(extractTokenFromCookie('no-dot')).toBeNull();
    });

    it('returns null for malformed base64 payload', () => {
      expect(extractTokenFromCookie('!!!.sig')).toBeNull();
    });
  });

  describe('SESSION_COOKIE_NAME', () => {
    it('has the expected test name', () => {
      // In test environment (NODE_ENV !== 'production'), __Host- prefix is omitted
      expect(SESSION_COOKIE_NAME).toBe('netly_session');
    });
  });

  describe('SETUP_SESSION_COOKIE_NAME & createSetupSessionCookie', () => {
    it('has the expected test name', () => {
      expect(SETUP_SESSION_COOKIE_NAME).toBe('netly_setup_session');
    });

    it('creates and verifies a valid setup session cookie', async () => {
      const cookie = await createSetupSessionCookie();
      expect(cookie).toContain('.');
      const token = await verifySessionCookie(cookie);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('server-side session persistence', () => {
    it('createSessionRecord calls db.session.upsert with expiresAt', async () => {
      (db.session.upsert as any).mockResolvedValue({ id: '1', token: 'test-token' });
      await createSessionRecord('test-token');
      expect(db.session.upsert).toHaveBeenCalledWith({
        where: { token: 'test-token' },
        update: {},
        create: {
          token: 'test-token',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('deleteSessionRecord calls db.session.deleteMany', async () => {
      (db.session.deleteMany as any).mockResolvedValue({ count: 1 });
      await deleteSessionRecord('test-token');
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'test-token' },
      });
    });

    it('sessionRecordExists returns true when count > 0', async () => {
      (db.session.count as any).mockResolvedValue(1);
      const result = await sessionRecordExists('test-token');
      expect(result).toBe(true);
    });

    it('sessionRecordExists returns false when count === 0', async () => {
      (db.session.count as any).mockResolvedValue(0);
      const result = await sessionRecordExists('test-token');
      expect(result).toBe(false);
    });

    it('cleanupExpiredSessions calls db.session.deleteMany with expired filter', async () => {
      (db.session.deleteMany as any).mockResolvedValue({ count: 2 });
      await cleanupExpiredSessions();
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });

  describe('verifySessionWithDb', () => {
    it('returns null when cookie verification fails', async () => {
      const result = await verifySessionWithDb('invalid');
      expect(result).toBeNull();
    });

    it('returns null when session record does not exist in DB', async () => {
      const cookie = await createSessionCookie();
      (db.session.count as any).mockResolvedValue(0);
      const result = await verifySessionWithDb(cookie);
      expect(result).toBeNull();
    });

    it('returns token when cookie is valid and session exists in DB', async () => {
      const cookie = await createSessionCookie();
      (db.session.count as any).mockResolvedValue(1);
      const result = await verifySessionWithDb(cookie);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('SESSION_SECRET guard', () => {
    it('throws when SESSION_SECRET is not set', async () => {
      vi.stubEnv('SESSION_SECRET', '');
      vi.resetModules();
      await expect(import('./auth-session')).rejects.toThrow('SESSION_SECRET environment variable is required');
      vi.unstubAllEnvs();
    });
  });

  describe('cookie max age helpers', () => {
    it('getSessionCookieMaxAge returns 7 days in seconds', () => {
      expect(getSessionCookieMaxAge()).toBe(7 * 24 * 60 * 60);
    });

    it('getSetupSessionCookieMaxAge returns 15 minutes in seconds', () => {
      expect(getSetupSessionCookieMaxAge()).toBe(15 * 60);
    });
  });

  describe('production environment detection', () => {
    it('isProductionEnv returns false in test environment', () => {
      expect(isProductionEnv()).toBe(false);
    });

    it('isProductionEnv returns true when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(isProductionEnv()).toBe(true);
      vi.unstubAllEnvs();
    });

    it('getSessionCookieName returns __Host- prefix in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(getSessionCookieName()).toBe('__Host-netly_session');
      expect(getSetupSessionCookieName()).toBe('__Host-netly_setup_session');
      const opts = getSessionCookieOptions();
      expect(opts.secure).toBe(true);
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('lax');
      expect(opts.path).toBe('/');
      vi.unstubAllEnvs();
    });

    it('getSessionCookieName returns unprefixed name in non-production', () => {
      expect(getSessionCookieName()).toBe('netly_session');
      expect(getSetupSessionCookieName()).toBe('netly_setup_session');
      const opts = getSessionCookieOptions();
      expect(opts.secure).toBe(false);
    });
  });
});
