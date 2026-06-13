import { NextResponse, NextRequest } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getChallenge } from '@/lib/challenge-store';
import {
  createSessionCookie,
  createSessionRecord,
  extractTokenFromCookie,
  verifySessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SETUP_SESSION_COOKIE_NAME,
  getSessionCookieMaxAge,
} from '@/lib/auth-session';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const { origin, rpID } = getWebAuthnConfig(request);

  const existingCount = await db.passKeyCredential.count({
    where: { userId: 'default' },
  });

  if (existingCount > 0) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const setupSessionCookie = request.cookies.get(SETUP_SESSION_COOKIE_NAME)?.value;

    let authenticated = false;
    if (sessionCookie && (await verifySessionCookie(sessionCookie))) {
      authenticated = true;
    } else if (setupSessionCookie && (await verifySessionCookie(setupSessionCookie))) {
      authenticated = true;
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
    }
  }

  const body = await request.json();

  if (!body.deviceName || typeof body.deviceName !== 'string' || body.deviceName.trim().length === 0) {
    return NextResponse.json({ error: 'ERR_DEVICE_NAME_REQUIRED' }, { status: 400 });
  }

  if (!body.state || typeof body.state !== 'string') {
    return NextResponse.json({ error: 'ERR_INVALID_STATE' }, { status: 400 });
  }

  const expectedChallenge = await getChallenge(body.state);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'ERR_CHALLENGE_EXPIRED_OR_INVALID' }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'ERR_REGISTRATION_VERIFICATION_FAILED' }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  let transports: string[] = body.response?.transports || [];

  const existing = await db.passKeyCredential.findUnique({
    where: { id: credential.id },
  });

  if (existing) {
    return NextResponse.json({ error: 'ERR_CREDENTIAL_ALREADY_REGISTERED' }, { status: 409 });
  }

  await db.passKeyCredential.create({
    data: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: JSON.stringify(transports),
      deviceName: body.deviceName.trim(),
      userId: 'default',
    },
  });

  const sessionCookie = await createSessionCookie();
  const token = extractTokenFromCookie(sessionCookie);
  if (token) {
    await createSessionRecord(token);
  }

  await auditLog('REGISTER_CREDENTIAL', `deviceName=${body.deviceName.trim()}`);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: getSessionCookieMaxAge(),
  });
  response.cookies.set(SETUP_SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });

  return response;
}
