import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getChallenge } from '@/lib/challenge-store';
import {
  createSessionCookie,
  createSessionRecord,
  extractTokenFromCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  getSessionCookieMaxAge,
} from '@/lib/auth-session';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { checkRateLimit } from '@/lib/rate-limiter';
import { auditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(`login-complete:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const { origin, rpID } = getWebAuthnConfig(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ERR_INVALID_REQUEST_BODY' }, { status: 400 });
  }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'ERR_INVALID_CREDENTIAL_ID' }, { status: 400 });
  }
  if (!body.state || typeof body.state !== 'string') {
    return NextResponse.json({ error: 'ERR_INVALID_STATE' }, { status: 400 });
  }
  if (!body.response || typeof body.response !== 'object') {
    return NextResponse.json({ error: 'ERR_INVALID_RESPONSE' }, { status: 400 });
  }

  const expectedChallenge = await getChallenge(body.state);
  if (!expectedChallenge) {
    await auditLog('LOGIN_CHALLENGE_EXPIRED', `state=${body.state}`);
    return NextResponse.json({ error: 'ERR_CHALLENGE_EXPIRED_OR_INVALID' }, { status: 400 });
  }

  const credential = await db.passKeyCredential.findUnique({
    where: { id: body.id as string },
  });

  if (!credential) {
    return NextResponse.json({ error: 'ERR_CREDENTIAL_NOT_FOUND' }, { status: 404 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.id,
      publicKey: new Uint8Array(credential.publicKey),
      counter: Number(credential.counter),
      transports: JSON.parse(credential.transports) as AuthenticatorTransport[],
    },
  });

  if (!verification.verified) {
    await auditLog('LOGIN_FAILURE', `credentialId=${credential.id}`);
    return NextResponse.json({ error: 'ERR_AUTHENTICATION_VERIFICATION_FAILED' }, { status: 400 });
  }

  await db.passKeyCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  const sessionCookie = await createSessionCookie();
  const token = extractTokenFromCookie(sessionCookie);
  if (token) {
    await createSessionRecord(token);
  }

  await auditLog('LOGIN_SUCCESS', `credentialId=${credential.id}`);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: getSessionCookieMaxAge(),
  });

  return response;
}
