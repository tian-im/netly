import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeSetupToken } from '@/lib/challenge-store';
import {
  createSetupSessionCookie,
  SETUP_SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  getSetupSessionCookieMaxAge,
} from '@/lib/auth-session';
import { auditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(`setup-token-consume:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ERR_INVALID_REQUEST_BODY' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim().toUpperCase() : '';

  if (!token || !(await validateAndConsumeSetupToken(token))) {
    await auditLog('SETUP_TOKEN_FAILED', `tokenPreview=${token.slice(0, 4)}...`);
    return NextResponse.json(
      { error: 'ERR_SETUP_TOKEN_EXPIRED_OR_INVALID' },
      { status: 400 },
    );
  }

  await auditLog('SETUP_TOKEN_CONSUMED');

  const setupSessionCookie = await createSetupSessionCookie();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SETUP_SESSION_COOKIE_NAME, setupSessionCookie, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: getSetupSessionCookieMaxAge(),
  });

  return response;
}
