import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

function mockRequest(url: string, method: 'GET', cookies?: Record<string, string>): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookies) {
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    headers['Cookie'] = cookieStr;
  }
  return new NextRequest(url, {
    method,
    headers,
  });
}

async function createAuthenticatedSession(): Promise<Record<string, string>> {
  const { createSessionCookie, createSessionRecord, extractTokenFromCookie } = await import('@/lib/auth-session');
  const sessionCookie = await createSessionCookie();
  const token = extractTokenFromCookie(sessionCookie);
  if (token) await createSessionRecord(token);
  return { netly_session: sessionCookie };
}

describe('MCP Bootstrap Status API Endpoint', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthorized requests', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp/bootstrap-status', 'GET');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns active: false when MCP_INITIAL_TOKEN is unset', async () => {
    const cookies = await createAuthenticatedSession();
    vi.stubEnv('MCP_INITIAL_TOKEN', '');

    const req = mockRequest('http://localhost:3000/api/mcp/bootstrap-status', 'GET', cookies);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(false);
  });

  it('returns active: false when MCP_INITIAL_TOKEN is too short (< 8 chars)', async () => {
    const cookies = await createAuthenticatedSession();
    vi.stubEnv('MCP_INITIAL_TOKEN', 'short');

    const req = mockRequest('http://localhost:3000/api/mcp/bootstrap-status', 'GET', cookies);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(false);
  });

  it('returns active: false when MCP_INITIAL_TOKEN is whitespace only', async () => {
    const cookies = await createAuthenticatedSession();
    vi.stubEnv('MCP_INITIAL_TOKEN', '       ');

    const req = mockRequest('http://localhost:3000/api/mcp/bootstrap-status', 'GET', cookies);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(false);
  });

  it('returns active: true when MCP_INITIAL_TOKEN is set and valid', async () => {
    const cookies = await createAuthenticatedSession();
    vi.stubEnv('MCP_INITIAL_TOKEN', 'my-secret-bootstrap-token');

    const req = mockRequest('http://localhost:3000/api/mcp/bootstrap-status', 'GET', cookies);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(true);
  });
});
