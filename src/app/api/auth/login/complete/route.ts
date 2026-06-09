import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getChallenge } from '@/lib/challenge-store';
import { createSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(request: Request) {
  const { origin, rpID } = getWebAuthnConfig(request);

  const body = await request.json();

  const expectedChallenge = getChallenge(body.state);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'ERR_CHALLENGE_EXPIRED_OR_INVALID' }, { status: 400 });
  }

  const credential = await db.passKeyCredential.findUnique({
    where: { id: body.id },
  });

  if (!credential) {
    return NextResponse.json({ error: 'ERR_CREDENTIAL_NOT_FOUND' }, { status: 404 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
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
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
