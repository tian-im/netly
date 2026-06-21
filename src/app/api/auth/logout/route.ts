import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  deleteSessionRecord,
  extractTokenFromCookie,
} from '@/lib/auth-session';
import { auditLog } from '@/lib/audit';
import { verifyCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-utils';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    const url = new URL(request.url);
    await auditLog('CSRF_FAILURE', `endpoint=${url.pathname}`);
    return NextResponse.json({ error: 'ERR_CSRF_FAILED' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`logout-api:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (cookieValue) {
    const token = extractTokenFromCookie(cookieValue);
    if (token) {
      await deleteSessionRecord(token);
    }
    await auditLog('LOGOUT');
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
