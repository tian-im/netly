import { db } from '@/lib/db';
import { getDatabaseInfo } from '../actions';
import SettingsClient from './settings-client';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { cookies } from 'next/headers';
import { PREFERENCES, getPreferenceFromCookies } from '@/lib/preferences';

export const revalidate = 0;

export default async function SettingsPage() {
  const cookieStore = cookies();
  // WHY: Reading preferences server-side from cookies lets us pass them as props,
  // eliminating the client-side disabled-flash pattern during hydration.
  const initialPreferences = {
    defaultCurrency: getPreferenceFromCookies(cookieStore, PREFERENCES.defaultCurrency),
    dateRange: getPreferenceFromCookies(cookieStore, PREFERENCES.dateRange),
    dateFormat: getPreferenceFromCookies(cookieStore, PREFERENCES.dateFormat),
    ruleMode: getPreferenceFromCookies(cookieStore, PREFERENCES.ruleMode),
  };

  const [accountsCount, transactionsCount, rulesCount, dbInfo, credentials, mcpTokens, txRange] = await Promise.all([
    db.account.count(),
    db.transaction.count(),
    db.categoryRule.count(),
    getDatabaseInfo(),
    db.passKeyCredential.findMany({
      where: { userId: DEFAULT_USER_ID },
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
    db.transaction.aggregate({
      _min: { date: true },
      _max: { date: true },
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

  const earliestTxDate = txRange._min.date ? txRange._min.date.toISOString() : null;
  const latestTxDate = txRange._max.date ? txRange._max.date.toISOString() : null;

  return (
    <SettingsClient
      accountsCount={accountsCount}
      transactionsCount={transactionsCount}
      rulesCount={rulesCount}
      dbInfo={dbInfo}
      passKeys={serializedCredentials}
      initialMcpTokens={serializedMcpTokens}
      earliestTxDate={earliestTxDate}
      latestTxDate={latestTxDate}
      initialPreferences={initialPreferences}
    />
  );
}
