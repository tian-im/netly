import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie, getSessionCookieName } from '@/lib/session-crypto';

const PUBLIC_PATHS = ['/login', '/setup'];

const COOKIE_NAME = getSessionCookieName();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // WHY: /api/mcp is excluded from session-check middleware because MCP uses
  // Bearer token authentication (validated in route.ts validateAuth()), not
  // cookies. /api/auth and /api/health are public by design (login needed for
  // auth, health checks have no sensitive data).
  // CSRF risk is mitigated by SameSite=Lax on all session cookies — a cross-site
  // form cannot authenticate because the browser won't attach the cookie on
  // non-navigational cross-site requests. For a local-first single-user app,
  // this is sufficient protection without adding per-route CSRF tokens.
  if (pathname === '/docs' || pathname.startsWith('/api/auth') || pathname.startsWith('/api/health') || pathname.startsWith('/api/mcp') || pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    const sessionCookie = request.cookies.get(COOKIE_NAME);
    if (sessionCookie) {
      const token = await verifySessionCookie(sessionCookie.value);
      if (token) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME);
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
