import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { clearTestDb } from '@/lib/test-db';

vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

const mockCredentialId = vi.hoisted(() => 'mock-credential-id-12345');
const mockCredentialId2 = vi.hoisted(() => 'mock-credential-id-67890');
const mockPublicKey = vi.hoisted(() => new Uint8Array([1, 2, 3, 4]));

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'mock-challenge-abc',
    rp: { name: 'Netly Ledger', id: 'localhost' },
    user: { id: 'default', name: 'default', displayName: 'Netly User' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: mockCredentialId,
        publicKey: mockPublicKey,
        counter: 1,
      },
    },
  }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'mock-challenge-xyz',
    allowCredentials: [{ id: mockCredentialId, type: 'public-key' }],
    timeout: 60000,
    userVerification: 'preferred',
  }),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter: 2 },
  }),
}));

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { POST as registerBegin } from './register/begin/route';
import { POST as registerComplete } from './register/complete/route';
import { POST as loginBegin } from './login/begin/route';
import { POST as loginComplete } from './login/complete/route';
import { GET as listCredentials, DELETE as deleteCredential } from './credentials/route';
import { POST as logoutHandler } from './logout/route';
import { GET as checkSession } from './session/route';
import { POST as generateSetupToken } from './setup-token/generate/route';
import { POST as consumeSetupToken } from './setup-token/consume/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

function mockRequest(url: string, body?: any, origin?: string, cookies?: Record<string, string>, extraHeaders?: Record<string, string>): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) headers['origin'] = origin;
  if (cookies) {
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    headers['Cookie'] = cookieStr;
  }
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockCredentialResponse = {
  id: mockCredentialId,
  rawId: mockCredentialId,
  response: {
    clientDataJSON: Buffer.from(JSON.stringify({
      type: 'webauthn.create',
      challenge: 'mock-challenge-abc',
      origin: 'http://localhost:3000',
    })).toString('base64url'),
    attestationObject: Buffer.from('mock-attestation').toString('base64url'),
    transports: ['internal'],
  },
  clientExtensionResults: {},
  type: 'public-key' as const,
};

beforeEach(async () => {
  await clearTestDb();
  vi.clearAllMocks();
  const { resetRateLimiter } = await import('@/lib/rate-limiter');
  resetRateLimiter();
});

afterAll(async () => {
  // Don't disconnect — see actions.integration.test.ts for rationale.
});

describe('Auth API routes', () => {
  describe('POST /api/auth/register/begin', () => {
    it('returns registration options with state', async () => {
      const response = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const data = await response.json();
      expect(data.challenge).toBe('mock-challenge-abc');
      expect(data.state).toBeDefined();
      expect(data.rp).toBeDefined();
      expect(generateRegistrationOptions).toHaveBeenCalled();
      const callArgs = vi.mocked(generateRegistrationOptions).mock.calls[0][0];
      expect(callArgs.authenticatorSelection?.residentKey).toBe('required');
    });

    it('maps existing credentials as excludeCredentials', async () => {
      await db.passKeyCredential.create({
        data: {
          id: 'existing-cred',
          publicKey: Buffer.from([1]),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Existing',
          userId: 'default',
        },
      });

      const { createSessionCookie } = await import('@/lib/auth-session');
      const session = await createSessionCookie();

      const response = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000', { netly_session: session }),
      );
      expect(generateRegistrationOptions).toHaveBeenCalled();
      const callArgs = vi.mocked(generateRegistrationOptions).mock.calls[0][0];
      expect(callArgs.excludeCredentials).toHaveLength(1);
      expect(callArgs.excludeCredentials![0].id).toBe('existing-cred');
    });
  });

  describe('POST /api/auth/register/complete', () => {
    it('registers a credential and sets session cookie', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state, deviceName: 'Test PassKey' },
          'http://localhost:3000',
        ),
      );

      const data = await response.json();
      expect(data.success).toBe(true);

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('netly_session');

      const stored = await db.passKeyCredential.findUnique({ where: { id: mockCredentialId } });
      expect(stored).not.toBeNull();
      expect(stored?.deviceName).toBe('Test PassKey');
    });

    it('returns 400 when device name is missing', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_DEVICE_NAME_REQUIRED');
    });

    it('returns 400 for invalid/expired challenge', async () => {
      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: 'invalid-state', deviceName: 'Test' },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_CHALLENGE_EXPIRED_OR_INVALID');
    });

    it('returns 409 when credential already exists', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '[]',
          deviceName: 'Existing',
          userId: 'default',
        },
      });

      const { createSessionCookie } = await import('@/lib/auth-session');
      const session = await createSessionCookie();

      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000', { netly_session: session }),
      );
      const beginData = await beginRes.json();

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state, deviceName: 'Duplicate' },
          'http://localhost:3000',
          { netly_session: session }
        ),
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('ERR_CREDENTIAL_ALREADY_REGISTERED');
    });

    it('returns 400 when registration verification fails', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: false,
        registrationInfo: undefined,
      });

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state, deviceName: 'Test' },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_REGISTRATION_VERIFICATION_FAILED');
    });

    it('handles missing transports gracefully', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const noTransportsResponse = {
        ...mockCredentialResponse,
        response: { ...mockCredentialResponse.response, transports: undefined },
      };

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...noTransportsResponse, state: beginData.state, deviceName: 'No Transports' },
          'http://localhost:3000',
        ),
      );

      const data = await response.json();
      expect(data.success).toBe(true);

      const stored = await db.passKeyCredential.findUnique({ where: { id: mockCredentialId } });
      expect(stored).not.toBeNull();
      expect(stored?.transports).toBe('[]');
    });

    it('seeds 23 default categories with English names after first registration', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state, deviceName: 'Seed Test EN' },
          'http://localhost:3000',
          undefined,
          { 'Accept-Language': 'en-US,en;q=0.9' },
        ),
      );

      expect(response.status).toBe(200);

      const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
      expect(categories).toHaveLength(23);
      expect(categories[0].name).toBe('Bank Fees');
      expect(categories.filter((c) => c.type === 'TRANSFER')).toHaveLength(1);
      expect(categories.find((c) => c.type === 'TRANSFER')?.name).toBe('Transfer');
    });

    it('seeds 23 default categories with Chinese names for zh locale', async () => {
      const beginRes = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, state: beginData.state, deviceName: 'Seed Test ZH' },
          'http://localhost:3000',
          undefined,
          { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
        ),
      );

      expect(response.status).toBe(200);

      const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
      expect(categories).toHaveLength(23);
      expect(categories.find((c) => c.type === 'TRANSFER')?.name).toBe('转账');
    });

    it('does not re-seed categories on subsequent registration (idempotent)', async () => {
      // First registration seeds categories
      const beginRes1 = await registerBegin(
        mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000'),
      );
      const beginData1 = await beginRes1.json();

      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-id-first',
            publicKey: new Uint8Array([1, 2, 3, 4]),
            counter: 1,
          },
        },
      } as any);

      const response1 = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, id: 'cred-id-first', state: beginData1.state, deviceName: 'First' },
          'http://localhost:3000',
        ),
      );
      expect(response1.status).toBe(200);

      const categoriesAfterFirst = await db.category.count();
      expect(categoriesAfterFirst).toBe(23);

      // Second registration should NOT add more categories
      const { createSessionCookie } = await import('@/lib/auth-session');
      const session = await createSessionCookie();

      const beginRes2 = await registerBegin(
        mockRequest(
          'http://localhost:3000/api/auth/register/begin',
          undefined,
          'http://localhost:3000',
          { netly_session: session },
        ),
      );
      const beginData2 = await beginRes2.json();

      const secondCredId = 'cred-id-second';
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: secondCredId,
            publicKey: new Uint8Array([5, 6, 7, 8]),
            counter: 1,
          },
        },
      } as any);

      const response2 = await registerComplete(
        mockRequest(
          'http://localhost:3000/api/auth/register/complete',
          { ...mockCredentialResponse, id: secondCredId, state: beginData2.state, deviceName: 'Second' },
          'http://localhost:3000',
          { netly_session: session },
        ),
      );
      expect(response2.status).toBe(200);

      const categoriesAfterSecond = await db.category.count();
      expect(categoriesAfterSecond).toBe(23); // Still 23 — not re-seeded
    });
  });

  describe('POST /api/auth/login/begin', () => {
    it('returns authentication options when credentials exist', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Test PassKey',
          userId: 'default',
        },
      });

      const response = await loginBegin(
        mockRequest('http://localhost:3000/api/auth/login/begin', undefined, 'http://localhost:3000'),
      );
      const data = await response.json();
      expect(data.challenge).toBe('mock-challenge-xyz');
      expect(data.state).toBeDefined();
      expect(generateAuthenticationOptions).toHaveBeenCalled();
      const callArgs = vi.mocked(generateAuthenticationOptions).mock.calls[0][0];
      expect(callArgs.allowCredentials).toBeUndefined();
    });

    it('returns 409 when no credentials exist', async () => {
      const response = await loginBegin(
        mockRequest('http://localhost:3000/api/auth/login/begin', undefined, 'http://localhost:3000'),
      );
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.redirect).toBe('/setup');
    });
  });

  describe('POST /api/auth/login/complete', () => {
    it('verifies authentication and creates session', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Test PassKey',
          userId: 'default',
        },
      });

      const beginRes = await loginBegin(
        mockRequest('http://localhost:3000/api/auth/login/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await loginComplete(
        mockRequest(
          'http://localhost:3000/api/auth/login/complete',
          { id: mockCredentialId, state: beginData.state, response: {} },
          'http://localhost:3000',
        ),
      );

      const data = await response.json();
      expect(data.success).toBe(true);

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('netly_session');
    });

    it('returns 400 for invalid challenge', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Test PassKey',
          userId: 'default',
        },
      });

      const response = await loginComplete(
        mockRequest(
          'http://localhost:3000/api/auth/login/complete',
          { id: mockCredentialId, state: 'invalid-state', response: {} },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_CHALLENGE_EXPIRED_OR_INVALID');
    });

    it('returns 404 for unknown credential', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Test PassKey',
          userId: 'default',
        },
      });

      const beginRes = await loginBegin(
        mockRequest('http://localhost:3000/api/auth/login/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      const response = await loginComplete(
        mockRequest(
          'http://localhost:3000/api/auth/login/complete',
          { id: 'unknown-id', state: beginData.state, response: {} },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('ERR_CREDENTIAL_NOT_FOUND');
    });

    it('returns 400 when authentication verification fails', async () => {
      await db.passKeyCredential.create({
        data: {
          id: mockCredentialId,
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '["internal"]',
          deviceName: 'Test PassKey',
          userId: 'default',
        },
      });

      const beginRes = await loginBegin(
        mockRequest('http://localhost:3000/api/auth/login/begin', undefined, 'http://localhost:3000'),
      );
      const beginData = await beginRes.json();

      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: false,
        authenticationInfo: { newCounter: 0 } as any,
      });

      const response = await loginComplete(
        mockRequest(
          'http://localhost:3000/api/auth/login/complete',
          { id: mockCredentialId, state: beginData.state, response: {} },
          'http://localhost:3000',
        ),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_AUTHENTICATION_VERIFICATION_FAILED');
    });
  });

  describe('GET /api/auth/session', () => {
    it('returns authenticated: false when no cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session');
      const response = await checkSession(req);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
    });

    it('returns authenticated: false for invalid cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: { Cookie: 'netly_session=invalid-cookie-value' },
      });
      const response = await checkSession(req);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
    });

    it('returns authenticated: true for valid session cookie', async () => {
      const { createSessionCookie, createSessionRecord, extractTokenFromCookie } = await import('@/lib/auth-session');
      const cookie = await createSessionCookie();
      const token = extractTokenFromCookie(cookie);
      if (token) await createSessionRecord(token);

      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: { Cookie: `netly_session=${cookie}` },
      });
      const response = await checkSession(req);
      const data = await response.json();
      expect(data.authenticated).toBe(true);
    });
  });

  describe('GET /api/auth/credentials', () => {
    it('returns empty list when no credentials exist', async () => {
      const response = await listCredentials();
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('returns list of credentials ordered by createdAt desc', async () => {
      await db.passKeyCredential.create({
        data: {
          id: 'cred-1',
          publicKey: Buffer.from([1]),
          counter: BigInt(1),
          transports: '[]',
          deviceName: 'First',
          userId: 'default',
          createdAt: new Date('2026-01-01'),
        },
      });
      await db.passKeyCredential.create({
        data: {
          id: 'cred-2',
          publicKey: Buffer.from([2]),
          counter: BigInt(1),
          transports: '[]',
          deviceName: 'Second',
          userId: 'default',
          createdAt: new Date('2026-06-01'),
        },
      });

      const response = await listCredentials();
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].deviceName).toBe('Second');
      expect(data[1].deviceName).toBe('First');
    });
  });

  describe('DELETE /api/auth/credentials', () => {
    it('deletes a credential when more than one exists', async () => {
      await db.passKeyCredential.create({
        data: { id: 'cred-1', publicKey: Buffer.from([1]), counter: BigInt(1), transports: '[]', deviceName: 'One', userId: 'default' },
      });
      await db.passKeyCredential.create({
        data: { id: 'cred-2', publicKey: Buffer.from([2]), counter: BigInt(1), transports: '[]', deviceName: 'Two', userId: 'default' },
      });

      const req = new Request('http://localhost:3000/api/auth/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cred-1' }),
      });
      const response = await deleteCredential(req);
      const data = await response.json();
      expect(data.success).toBe(true);

      const remaining = await db.passKeyCredential.count();
      expect(remaining).toBe(1);
    });

    it('returns 400 when trying to delete the last credential', async () => {
      await db.passKeyCredential.create({
        data: { id: 'cred-1', publicKey: Buffer.from([1]), counter: BigInt(1), transports: '[]', deviceName: 'Only', userId: 'default' },
      });

      const req = new Request('http://localhost:3000/api/auth/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cred-1' }),
      });
      const response = await deleteCredential(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ERR_CANNOT_REMOVE_LAST_PASSKEY');
    });

    it('returns 404 when credential does not exist', async () => {
      const req = new Request('http://localhost:3000/api/auth/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'nonexistent' }),
      });
      const response = await deleteCredential(req);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session cookie', async () => {
      const response = await logoutHandler(
        mockRequest('http://localhost:3000/api/auth/logout'),
      );
      const data = await response.json();
      expect(data.success).toBe(true);

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('netly_session=');
    });
  });

  describe('Setup Token Flow', () => {
    it('rejects setup token generation if not authenticated', async () => {
      const req = mockRequest('http://localhost:3000/api/auth/setup-token/generate');
      const res = await generateSetupToken(req);
      expect(res.status).toBe(401);
    });

    it('generates setup token when authenticated', async () => {
      const { createSessionCookie } = await import('@/lib/auth-session');
      const session = await createSessionCookie();
      const req = mockRequest(
        'http://localhost:3000/api/auth/setup-token/generate',
        undefined,
        'http://localhost:3000',
        { netly_session: session }
      );
      const res = await generateSetupToken(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.url).toContain(data.token);
      expect(data.expiresAt).toBeGreaterThan(Date.now());
    });

    it('rejects invalid setup token consumption', async () => {
      const req = mockRequest('http://localhost:3000/api/auth/setup-token/consume', { token: 'INVALID' });
      const res = await consumeSetupToken(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('ERR_SETUP_TOKEN_EXPIRED_OR_INVALID');
    });

    it('consumes valid setup token and sets temporary session cookie', async () => {
      const { createSessionCookie } = await import('@/lib/auth-session');
      const session = await createSessionCookie();
      const genReq = mockRequest(
        'http://localhost:3000/api/auth/setup-token/generate',
        undefined,
        'http://localhost:3000',
        { netly_session: session }
      );
      const genRes = await generateSetupToken(genReq);
      const { token } = await genRes.json();

      const consumeReq = mockRequest('http://localhost:3000/api/auth/setup-token/consume', { token });
      const consumeRes = await consumeSetupToken(consumeReq);
      expect(consumeRes.status).toBe(200);
      const data = await consumeRes.json();
      expect(data.success).toBe(true);

      const setCookie = consumeRes.headers.get('set-cookie');
      expect(setCookie).toContain('netly_setup_session=');
    });

    it('requires authentication for registration if credentials exist in DB', async () => {
      await db.passKeyCredential.create({
        data: {
          id: 'existing-cred-id',
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '[]',
          deviceName: 'Exist',
          userId: 'default',
        },
      });

      const reqBegin = mockRequest('http://localhost:3000/api/auth/register/begin', undefined, 'http://localhost:3000');
      const resBegin = await registerBegin(reqBegin);
      expect(resBegin.status).toBe(401);

      const reqComplete = mockRequest('http://localhost:3000/api/auth/register/complete', { deviceName: 'New' }, 'http://localhost:3000');
      const resComplete = await registerComplete(reqComplete);
      expect(resComplete.status).toBe(401);
    });

    it('allows registration using setup session cookie when credentials exist', async () => {
      await db.passKeyCredential.create({
        data: {
          id: 'existing-cred-id',
          publicKey: Buffer.from(mockPublicKey),
          counter: BigInt(1),
          transports: '[]',
          deviceName: 'Exist',
          userId: 'default',
        },
      });

      const { createSetupSessionCookie } = await import('@/lib/auth-session');
      const setupCookie = await createSetupSessionCookie();

      const reqBegin = mockRequest(
        'http://localhost:3000/api/auth/register/begin',
        undefined,
        'http://localhost:3000',
        { netly_setup_session: setupCookie }
      );
      const resBegin = await registerBegin(reqBegin);
      expect(resBegin.status).toBe(200);
      const beginData = await resBegin.json();

      const newCredResponse = {
        ...mockCredentialResponse,
        id: 'new-device-cred-id-999',
        rawId: 'new-device-cred-id-999',
      };
      
      const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
      vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'new-device-cred-id-999',
            publicKey: new Uint8Array([5, 6, 7, 8]),
            counter: 1,
          },
        },
      } as any);

      const reqComplete = mockRequest(
        'http://localhost:3000/api/auth/register/complete',
        { ...newCredResponse, state: beginData.state, deviceName: 'New Device Bootstrapped' },
        'http://localhost:3000',
        { netly_setup_session: setupCookie }
      );

      const resComplete = await registerComplete(reqComplete);
      expect(resComplete.status).toBe(200);

      const setCookie = resComplete.headers.get('set-cookie') || '';
      expect(setCookie).toContain('netly_session=');
      expect(setCookie).toContain('netly_setup_session=');

      const saved = await db.passKeyCredential.findUnique({ where: { id: 'new-device-cred-id-999' } });
      expect(saved).not.toBeNull();
      expect(saved?.deviceName).toBe('New Device Bootstrapped');
    });
  });
});
