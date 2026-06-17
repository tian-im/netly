import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { setChallenge, generateState } from '@/lib/challenge-store';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { checkRateLimit } from '@/lib/rate-limiter';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(`login-begin:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const { origin, rpID } = getWebAuthnConfig(request);

  const credentials = await db.passKeyCredential.findMany({
    where: { userId: DEFAULT_USER_ID },
  });

  if (credentials.length === 0) {
    return NextResponse.json(
      { error: 'ERR_NO_CREDENTIALS_REGISTERED', redirect: '/setup' },
      { status: 409 },
    );
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  const state = generateState();
  await setChallenge(state, options.challenge);

  return NextResponse.json({ ...options, state });
}
