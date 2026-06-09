import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { setChallenge, generateState } from '@/lib/challenge-store';
import { db } from '@/lib/db';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(request: Request) {
  const { origin, rpID } = getWebAuthnConfig(request);

  const credentials = await db.passKeyCredential.findMany({
    where: { userId: 'default' },
  });

  if (credentials.length === 0) {
    return NextResponse.json({ error: 'ERR_NO_CREDENTIALS_REGISTERED', redirect: '/setup' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  const state = generateState();
  setChallenge(state, options.challenge);

  return NextResponse.json({ ...options, state });
}
