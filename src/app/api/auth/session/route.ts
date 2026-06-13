import { NextRequest, NextResponse } from 'next/server';
import {
  verifySessionWithDb,
  SESSION_COOKIE_NAME,
} from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.json({ authenticated: false });
  }

  const token = await verifySessionWithDb(cookieValue);
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true });
}
