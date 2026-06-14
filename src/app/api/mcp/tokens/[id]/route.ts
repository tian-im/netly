import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionWithDb, SESSION_COOKIE_NAME } from '@/lib/auth-session';

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
