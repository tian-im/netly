import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { verifyCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp, checkPayloadSize } from '@/lib/request-utils';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`credentials-get:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const credentials = await db.passKeyCredential.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json(credentials);
}

export async function DELETE(request: NextRequest) {
  if (!verifyCsrf(request)) {
    const url = new URL(request.url);
    await auditLog('CSRF_FAILURE', `endpoint=${url.pathname}`);
    return NextResponse.json({ error: 'ERR_CSRF_FAILED' }, { status: 403 });
  }

  if (!checkPayloadSize(request, 1024 * 1024)) { // 1MB limit
    return NextResponse.json({ error: 'ERR_PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`credentials-delete:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'ERR_RATE_LIMITED' }, { status: 429 });
  }

  const { id } = await request.json();

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'ERR_INVALID_CREDENTIAL_ID' }, { status: 400 });
  }

  const credential = await db.passKeyCredential.findUnique({
    where: { id },
  });

  if (!credential) {
    return NextResponse.json({ error: 'ERR_CREDENTIAL_NOT_FOUND' }, { status: 404 });
  }

  const totalCount = await db.passKeyCredential.count({
    where: { userId: DEFAULT_USER_ID },
  });

  if (totalCount <= 1) {
    return NextResponse.json(
      { error: 'ERR_CANNOT_REMOVE_LAST_PASSKEY' },
      { status: 400 },
    );
  }

  await db.passKeyCredential.delete({ where: { id } });

  await auditLog('DELETE_CREDENTIAL', `deviceName=${credential.deviceName || 'unknown'}`);

  return NextResponse.json({ success: true });
}
