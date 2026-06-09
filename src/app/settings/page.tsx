import { db } from '@/lib/db';
import { getDatabaseInfo } from '../actions';
import SettingsClient from './settings-client';

export const revalidate = 0;

export default async function SettingsPage() {
  const [accountsCount, transactionsCount, rulesCount, dbInfo, credentials, mcpTokens] = await Promise.all([
    db.account.count(),
    db.transaction.count(),
    db.categoryRule.count(),
    getDatabaseInfo(),
    db.passKeyCredential.findMany({
      where: { userId: 'default' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
    db.mcpToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);

  const serializedCredentials = credentials.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
  }));

  const serializedMcpTokens = mcpTokens.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
  }));

  return (
    <SettingsClient
      accountsCount={accountsCount}
      transactionsCount={transactionsCount}
      rulesCount={rulesCount}
      dbInfo={dbInfo}
      passKeys={serializedCredentials}
      initialMcpTokens={serializedMcpTokens}
    />
  );
}
