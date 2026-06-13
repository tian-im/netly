import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export async function GET() {
  const credentials = await db.passKeyCredential.findMany({
    where: { userId: 'default' },
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

export async function DELETE(request: Request) {
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
    where: { userId: 'default' },
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
