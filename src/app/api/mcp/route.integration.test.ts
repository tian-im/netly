import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, clearTestDb } from '@/lib/test-db';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

const db = getTestDb();

function mockRequest(url: string, method: 'GET' | 'POST', body?: any, bearerToken?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('MCP SSE & JSON-RPC Route Handler', () => {
  let tokenPlaintext = 'netly_test_secret_1234567890';
  let tokenHash = createHash('sha256').update(tokenPlaintext).digest('hex');

  beforeEach(async () => {
    await clearTestDb();
    
    // Seed an MCP token
    await db.mcpToken.create({
      data: {
        name: 'Test Agent',
        token: tokenHash,
      },
    });
  });

  it('rejects GET request without valid Bearer token', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp', 'GET');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts GET request with valid Bearer token and initiates SSE stream', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp', 'GET', undefined, tokenPlaintext);
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('updates lastUsedAt when token is used', async () => {
    // Verify lastUsedAt is null before use
    let token = await db.mcpToken.findUnique({ where: { token: tokenHash } });
    expect(token?.lastUsedAt).toBeNull();

    // Use the token to authenticate a request
    const req = mockRequest('http://localhost:3000/api/mcp', 'GET', undefined, tokenPlaintext);
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Drain the SSE stream to close the connection gracefully
    const reader = res.body?.getReader();
    if (reader) {
      // Give async lastUsedAt update time to complete, then cancel
      await new Promise((resolve) => setTimeout(resolve, 100));
      reader.cancel();
    }

    // Verify lastUsedAt was updated
    token = await db.mcpToken.findUnique({ where: { token: tokenHash } });
    expect(token?.lastUsedAt).not.toBeNull();
    expect(token?.lastUsedAt!.getTime()).toBeGreaterThan(Date.now() - 5000);
  });

  it('rejects POST request without valid Bearer token', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp?sessionId=123', 'POST', { jsonrpc: '2.0', method: 'tools/list' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects POST request with missing sessionId', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp', 'POST', { jsonrpc: '2.0', method: 'tools/list' }, tokenPlaintext);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Missing sessionId');
  });

  it('rejects POST request with non-existent sessionId', async () => {
    const req = mockRequest('http://localhost:3000/api/mcp?sessionId=nonexistent', 'POST', { jsonrpc: '2.0', method: 'tools/list' }, tokenPlaintext);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('E2E protocol connection: establishes session and invokes tools list & tool execution', async () => {
    // 1. Establish SSE Connection (GET)
    const reqGet = mockRequest('http://localhost:3000/api/mcp', 'GET', undefined, tokenPlaintext);
    const resGet = await GET(reqGet);
    expect(resGet.status).toBe(200);

    const reader = resGet.body?.getReader();
    expect(reader).toBeDefined();

    // Read the first chunk (endpoint event) to get the sessionId
    const { value: firstVal } = await reader!.read();
    const firstChunk = new TextDecoder().decode(firstVal);
    expect(firstChunk).toContain('event: endpoint');

    const sessionMatch = firstChunk.match(/sessionId=([^ \n\r]+)/);
    expect(sessionMatch).not.toBeNull();
    const sessionId = sessionMatch![1];
    expect(sessionId).toBeDefined();

    // 2. Query tools list (POST tools/list)
    const listMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    };
    const reqPostList = mockRequest(`http://localhost:3000/api/mcp?sessionId=${sessionId}`, 'POST', listMsg, tokenPlaintext);
    const resPostList = await POST(reqPostList);
    expect(resPostList.status).toBe(200);

    // Read the response from SSE stream
    const { value: listVal } = await reader!.read();
    const listChunk = new TextDecoder().decode(listVal);
    expect(listChunk).toContain('event: message');
    
    const jsonStr = listChunk.substring(listChunk.indexOf('data: ') + 6).trim();
    const listResponse = JSON.parse(jsonStr);
    expect(listResponse.id).toBe(1);
    expect(listResponse.result.tools).toBeDefined();
    
    // Check one of the registered tools exists
    const toolNames = listResponse.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('list_categories');

    // 3. Execute tool (POST tools/call)
    const callMsg = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_categories',
        arguments: {},
      },
    };
    const reqPostCall = mockRequest(`http://localhost:3000/api/mcp?sessionId=${sessionId}`, 'POST', callMsg, tokenPlaintext);
    const resPostCall = await POST(reqPostCall);
    expect(resPostCall.status).toBe(200);

    // Read execution result from SSE stream
    const { value: callVal } = await reader!.read();
    const callChunk = new TextDecoder().decode(callVal);
    expect(callChunk).toContain('event: message');

    const callJsonStr = callChunk.substring(callChunk.indexOf('data: ') + 6).trim();
    const callResponse = JSON.parse(callJsonStr);
    expect(callResponse.id).toBe(2);
    expect(callResponse.result.content).toBeDefined();
    expect(callResponse.result.content[0].type).toBe('text');
  });
});
