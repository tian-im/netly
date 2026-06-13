import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, clearTestDb } from '@/lib/test-db';
import { GET, POST, DELETE } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

const db = getTestDb();

function mockRequest(url: string, method: 'GET' | 'POST' | 'DELETE', body?: any, cookies?: Record<string, string>): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookies) {
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    headers['Cookie'] = cookieStr;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createAuthenticatedSession(): Promise<Record<string, string>> {
  const { createSessionCookie, createSessionRecord, extractTokenFromCookie } = await import('@/lib/auth-session');
  const sessionCookie = await createSessionCookie();
  const token = extractTokenFromCookie(sessionCookie);
  if (token) await createSessionRecord(token);
  return { netly_session: sessionCookie };
}

describe('MCP Tokens API Endpoint', () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  it('rejects requests if not authorized', async () => {
    const reqGet = mockRequest('http://localhost:3000/api/mcp/tokens', 'GET');
    const resGet = await GET(reqGet);
    expect(resGet.status).toBe(401);
    const dataGet = await resGet.json();
    expect(dataGet.error).toBe('ERR_UNAUTHORIZED');

    const reqPost = mockRequest('http://localhost:3000/api/mcp/tokens', 'POST', { name: 'Test Token' });
    const resPost = await POST(reqPost);
    expect(resPost.status).toBe(401);

    const reqDelete = mockRequest('http://localhost:3000/api/mcp/tokens', 'DELETE', { id: 'some-id' });
    const resDelete = await DELETE(reqDelete);
    expect(resDelete.status).toBe(401);
  });

  it('CRUD lifecycle of McpToken when authorized', async () => {
    const cookies = await createAuthenticatedSession();

    // 1. Create token (POST)
    const reqCreate = mockRequest('http://localhost:3000/api/mcp/tokens', 'POST', { name: 'OpenCode Client' }, cookies);
    const resCreate = await POST(reqCreate);
    expect(resCreate.status).toBe(200);
    const createdToken = await resCreate.json();
    expect(createdToken.name).toBe('OpenCode Client');
    expect(createdToken.token).toBeDefined(); // Plaintext token returned once
    expect(createdToken.token.startsWith('netly_')).toBe(true);

    // Verify it is hashed and saved in DB
    const dbTokens = await db.mcpToken.findMany();
    expect(dbTokens).toHaveLength(1);
    expect(dbTokens[0].name).toBe('OpenCode Client');
    expect(dbTokens[0].token).not.toBe(createdToken.token); // Hashed

    // 2. List tokens (GET)
    const reqList = mockRequest('http://localhost:3000/api/mcp/tokens', 'GET', undefined, cookies);
    const resList = await GET(reqList);
    expect(resList.status).toBe(200);
    const list = await resList.json();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('OpenCode Client');
    expect(list[0].token).toBeUndefined(); // Security: never return the hashed/raw token in GET

    // 3. Delete/revoke token (DELETE)
    const reqDelete = mockRequest('http://localhost:3000/api/mcp/tokens', 'DELETE', { id: createdToken.id }, cookies);
    const resDelete = await DELETE(reqDelete);
    expect(resDelete.status).toBe(200);
    const deleteResult = await resDelete.json();
    expect(deleteResult.success).toBe(true);

    // Verify deleted from DB
    const finalTokens = await db.mcpToken.findMany();
    expect(finalTokens).toHaveLength(0);
  });

  it('rejects POST with invalid name', async () => {
    const cookies = await createAuthenticatedSession();

    const reqCreate = mockRequest('http://localhost:3000/api/mcp/tokens', 'POST', { name: '  ' }, cookies);
    const resCreate = await POST(reqCreate);
    expect(resCreate.status).toBe(400);
    const err = await resCreate.json();
    expect(err.error).toBe('ERR_MCP_NAME_REQUIRED');
  });

  it('rejects DELETE with invalid ID', async () => {
    const cookies = await createAuthenticatedSession();

    const reqDelete = mockRequest('http://localhost:3000/api/mcp/tokens', 'DELETE', { id: '' }, cookies);
    const resDelete = await DELETE(reqDelete);
    expect(resDelete.status).toBe(400);
    const err = await resDelete.json();
    expect(err.error).toBe('ERR_MCP_TOKEN_NOT_FOUND');
  });
});
