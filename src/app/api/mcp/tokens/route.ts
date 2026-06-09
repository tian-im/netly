import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { createHash, randomBytes } from 'crypto';

// Helper to check user session authorization
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return false;
  const token = await verifySessionCookie(cookieValue);
  return !!token;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const tokens = await db.mcpToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(tokens);
  } catch (error: any) {
    console.error('Error fetching MCP tokens:', error);
    return NextResponse.json({ error: 'ERR_UNKNOWN' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'ERR_MCP_NAME_REQUIRED' }, { status: 400 });
    }

    // Generate high-entropy secure token: netly_ + 32 hex chars (16 bytes)
    const rawToken = `netly_${randomBytes(16).toString('hex')}`;
    // Hashed token to store in database
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    const newToken = await db.mcpToken.create({
      data: {
        name: name.trim(),
        token: hashedToken,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Return the raw plaintext token ONLY ONCE at creation time
    return NextResponse.json({
      ...newToken,
      token: rawToken,
    });
  } catch (error: any) {
    console.error('Error creating MCP token:', error);
    return NextResponse.json({ error: 'ERR_UNKNOWN' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'ERR_UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ERR_MCP_TOKEN_NOT_FOUND' }, { status: 400 });
    }

    await db.mcpToken.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking MCP token:', error);
    return NextResponse.json({ error: 'ERR_UNKNOWN' }, { status: 500 });
  }
}
