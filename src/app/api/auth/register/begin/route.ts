import { NextResponse, NextRequest } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { setChallenge, generateState } from '@/lib/challenge-store';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { verifySessionCookie, SESSION_COOKIE_NAME, SETUP_SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  /* v8 ignore next 3 */
  if (!checkRateLimit(`register-begin:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const { origin, rpID } = getWebAuthnConfig(request);

  const existingCredentials = await db.passKeyCredential.findMany({
    where: { userId: DEFAULT_USER_ID },
  });

  if (existingCredentials.length > 0) {
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

  const options = await generateRegistrationOptions({
    rpName: 'Netly Ledger',
    rpID,
    userName: DEFAULT_USER_ID,
    userDisplayName: 'Netly User',
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.id,
      transports: JSON.parse(cred.transports) as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  const state = generateState();
  setChallenge(state, options.challenge);

  return NextResponse.json({ ...options, state });
}
