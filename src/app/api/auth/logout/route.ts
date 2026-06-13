import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  deleteSessionRecord,
  extractTokenFromCookie,
} from '@/lib/auth-session';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
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
