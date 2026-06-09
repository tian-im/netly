import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { setSetupToken } from '@/lib/challenge-store';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  const token = await verifySessionCookie(cookieValue);
  if (!token) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  // Generate an 8-character uppercase alphanumeric setup code
  const setupToken = crypto.randomUUID().slice(0, 8).toUpperCase();
  setSetupToken(setupToken);

  const { origin } = getWebAuthnConfig(request);
  const setupUrl = `${origin}/login?setupToken=${setupToken}`;

  return NextResponse.json({
    token: setupToken,
    url: setupUrl,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
}
