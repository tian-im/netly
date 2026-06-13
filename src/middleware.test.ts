// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

// Mock auth-session so we can control verifySessionWithDb
vi.mock('@/lib/auth-session', () => ({
  verifySessionWithDb: vi.fn(),
  SESSION_COOKIE_NAME: 'netly_session',
}));

import { verifySessionWithDb } from '@/lib/auth-session';

function createRequest(pathname: string, sessionCookie?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (sessionCookie !== undefined) {
    headers.set('Cookie', `netly_session=${sessionCookie}`);
  }
  return new NextRequest(url, { headers });
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP endpoint bypass', () => {
    it('allows /api/mcp through without any session cookie', async () => {
      const req = createRequest('/api/mcp');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows /api/mcp through with an invalid session cookie', async () => {
      const req = createRequest('/api/mcp', 'invalid-cookie');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows /api/mcp/subroute through without session cookie', async () => {
      const req = createRequest('/api/mcp/some/extra/path');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe('existing bypass paths', () => {
    it('allows /api/auth through', async () => {
      const req = createRequest('/api/auth/login');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows /_next through', async () => {
      const req = createRequest('/_next/static/chunk.js');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows /favicon.ico through', async () => {
      const req = createRequest('/favicon.ico');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe('protected paths', () => {
    it('redirects protected path to /login when no session cookie exists', async () => {
      const req = createRequest('/api/settings');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('Location')).toBe('http://localhost:3000/login');
    });

    it('redirects protected path to /login when session cookie is invalid', async () => {
      vi.mocked(verifySessionWithDb).mockResolvedValue(null);
      const req = createRequest('/dashboard', 'some-cookie');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('Location')).toBe('http://localhost:3000/login');
    });

    it('allows protected path through when session cookie is valid', async () => {
      vi.mocked(verifySessionWithDb).mockResolvedValue('valid-token');
      const req = createRequest('/dashboard', 'valid-cookie');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe('public paths', () => {
    it('allows /login through without session cookie', async () => {
      const req = createRequest('/login');
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('redirects /login to / when already authenticated', async () => {
      vi.mocked(verifySessionWithDb).mockResolvedValue('valid-token');
      const req = createRequest('/login', 'valid-cookie');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('Location')).toBe('http://localhost:3000/');
    });
  });

  describe('verifySessionWithDb not called for bypassed paths', () => {
    it('does not call verifySessionWithDb for /api/mcp requests', async () => {
      const req = createRequest('/api/mcp');
      await middleware(req);
      expect(verifySessionWithDb).not.toHaveBeenCalled();
    });

    it('does not call verifySessionWithDb for /api/auth requests', async () => {
      const req = createRequest('/api/auth/login');
      await middleware(req);
      expect(verifySessionWithDb).not.toHaveBeenCalled();
    });
  });
});
