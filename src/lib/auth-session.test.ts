// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { createSessionCookie, verifySessionCookie, SESSION_COOKIE_NAME, createSetupSessionCookie, SETUP_SESSION_COOKIE_NAME } from './auth-session';

describe('auth-session', () => {
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

  describe('SESSION_COOKIE_NAME', () => {
    it('has the expected name', () => {
      expect(SESSION_COOKIE_NAME).toBe('netly_session');
    });
  });

  describe('SETUP_SESSION_COOKIE_NAME & createSetupSessionCookie', () => {
    it('has the expected name', () => {
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
});
