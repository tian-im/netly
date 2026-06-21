import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionWithDb, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { verifyCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp, checkPayloadSize } from '@/lib/request-utils';
import { auditLog } from '@/lib/audit';

// Helper to check user session authorization
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return false;
  const token = await verifySessionWithDb(cookieValue);
  return !!token;
}

// DELETE /api/mcp/tokens/[id] — Revoke an MCP token by its ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!verifyCsrf(request)) {
    const url = new URL(request.url);
    await auditLog('CSRF_FAILURE', `endpoint=${url.pathname}`);
    return NextResponse.json({ error: 'ERR_CSRF_FAILED' }, { status: 403 });
  }

  if (!checkPayloadSize(request, 1024 * 1024)) { // 1MB limit
    return NextResponse.json({ error: 'ERR_PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`mcp-tokens-delete-id:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'ERR_MCP_TOKEN_NOT_FOUND' }, { status: 400 });
  }

  try {
    const existing = await db.mcpToken.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ERR_MCP_TOKEN_NOT_FOUND' }, { status: 404 });
    }

    await db.mcpToken.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking MCP token:', error);
    return NextResponse.json({ error: 'ERR_UNKNOWN' }, { status: 500 });
  }
}
