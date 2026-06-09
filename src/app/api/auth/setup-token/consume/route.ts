import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeSetupToken } from '@/lib/challenge-store';
import { createSetupSessionCookie, SETUP_SESSION_COOKIE_NAME } from '@/lib/auth-session';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = body.token?.trim().toUpperCase();

  if (!token || !validateAndConsumeSetupToken(token)) {
    return NextResponse.json(
      { error: 'ERR_SETUP_TOKEN_EXPIRED_OR_INVALID' },
      { status: 400 },
    );
  }

  const setupSessionCookie = await createSetupSessionCookie();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SETUP_SESSION_COOKIE_NAME, setupSessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 mins
  });

  return response;
}
