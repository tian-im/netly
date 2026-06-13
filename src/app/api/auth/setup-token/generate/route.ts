import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { setSetupToken } from '@/lib/challenge-store';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  const token = await verifySessionCookie(cookieValue);
  if (!token) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  // Use full UUID without dashes for maximum entropy (32 hex chars vs 8)
  const setupToken = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  await setSetupToken(setupToken);

  await auditLog('SETUP_TOKEN_GENERATED');

  const { origin } = getWebAuthnConfig(request);
  const setupUrl = `${origin}/login?setupToken=${setupToken}`;
  const expiresAt = Date.now() + 15 * 60 * 1000;

  return NextResponse.json({
    token: setupToken,
    url: setupUrl,
    expiresAt,
  });
}
