import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { setSetupToken } from '@/lib/challenge-store';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { verifyCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp, checkPayloadSize } from '@/lib/request-utils';
import { SETUP_TOKEN_TTL_MS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    const url = new URL(request.url);
    await auditLog('CSRF_FAILURE', `endpoint=${url.pathname}`);
    return NextResponse.json({ error: 'ERR_CSRF_FAILED' }, { status: 403 });
  }

  if (!checkPayloadSize(request, 1024 * 1024)) { // 1MB limit
    return NextResponse.json({ error: 'ERR_PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`setup-token-generate:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  // Cleanup expired setup tokens from DB to prevent accumulation (Point 5)
  const expirationThreshold = new Date(Date.now() - SETUP_TOKEN_TTL_MS);
  try {
    await db.setupToken.deleteMany({
      where: { createdAt: { lt: expirationThreshold } }
    });
  } catch (err) {
    console.error('Failed to clean up expired setup tokens:', err);
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  const token = await verifySessionCookie(cookieValue);
  /* v8 ignore next 3 */
  if (!token) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  // Use full UUID without dashes for maximum entropy (32 hex chars vs 8)
  const setupToken = crypto.randomUUID().replace(/-/g, '').toUpperCase();

  // Store in-memory for fast access (primary) and in DB for crash recovery
  await setSetupToken(setupToken);
  /* v8 ignore next 7 */
  try {
    await db.setupToken.create({ data: { token: setupToken } });
  } catch {
    // DB persistence is best-effort for crash recovery across restarts.
    // In-flight tokens are still preserved in the in-memory store.
    console.warn('[setup-token] Failed to persist token to DB, in-memory only');
  }

  await auditLog('SETUP_TOKEN_GENERATED');

  const { origin } = getWebAuthnConfig(request);
  const setupUrl = `${origin}/login?setupToken=${setupToken}`;
  const expiresAt = Date.now() + SETUP_TOKEN_TTL_MS;

  return NextResponse.json({
    token: setupToken,
    url: setupUrl,
    expiresAt,
  });
}
