import { NextRequest, NextResponse } from 'next/server';
import { verifySessionWithDb, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-utils';
import { MIN_BOOTSTRAP_TOKEN_LENGTH } from '@/lib/constants';

export const runtime = 'nodejs';

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return false;
  const token = await verifySessionWithDb(cookieValue);
  return !!token;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`mcp-bootstrap-status-get:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  const token = process.env.MCP_INITIAL_TOKEN?.trim();
  const isActive = !!token && token.length >= MIN_BOOTSTRAP_TOKEN_LENGTH;

  return NextResponse.json({ active: isActive });
}
