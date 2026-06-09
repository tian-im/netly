import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';

const PUBLIC_PATHS = ['/login', '/setup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (sessionCookie) {
      const token = await verifySessionCookie(sessionCookie.value);
      if (token) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = await verifySessionCookie(sessionCookie.value);
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*|_next/static).*)', '/'],
};
