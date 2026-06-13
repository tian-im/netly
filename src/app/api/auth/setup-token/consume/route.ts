import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeSetupToken } from '@/lib/challenge-store';
import {
  createSetupSessionCookie,
  SETUP_SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  getSetupSessionCookieMaxAge,
} from '@/lib/auth-session';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  /* v8 ignore next 3 */
  if (!checkRateLimit(`setup-token-consume:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  /* v8 ignore next 5 */
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ERR_INVALID_REQUEST_BODY' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim().toUpperCase() : '';

  // Check in-memory store first (fast path)
  let valid = await validateAndConsumeSetupToken(token);

  // If in-memory succeeded, also clean up DB record to prevent reuse
  /* v8 ignore next 7 */
  if (valid) {
    try {
      await db.setupToken.deleteMany({ where: { token } });
    } catch {
      // Best-effort cleanup
    }
  }

  // Fallback to DB check (crash recovery path — e.g., server restarted between generate and consume)
  /* v8 ignore start */
  if (!valid && token) {
    try {
      const dbEntry = await db.setupToken.findUnique({ where: { token } });
      if (dbEntry) {
        const age = Date.now() - dbEntry.createdAt.getTime();
        if (age < SETUP_TOKEN_TTL_MS) {
          await db.setupToken.delete({ where: { token } });
          valid = true;
        } else {
          // Token expired — clean up
          await db.setupToken.delete({ where: { token } });
        }
      }
    } catch {
      // DB check is best-effort
    }
  }
  /* v8 ignore end */

  if (!token || !valid) {
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
