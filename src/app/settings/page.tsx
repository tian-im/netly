import { db } from '@/lib/db';
import { getDatabaseInfo } from '../actions';
import SettingsClient from './settings-client';

export const revalidate = 0; // Disable cache so settings page metrics are always live

export default async function SettingsPage() {
  const accountsCount = await db.account.count();
  const transactionsCount = await db.transaction.count();
  const rulesCount = await db.categoryRule.count();
  const dbInfo = await getDatabaseInfo();

  return (
    <SettingsClient
      accountsCount={accountsCount}
      transactionsCount={transactionsCount}
      rulesCount={rulesCount}
      dbInfo={dbInfo}
    />
  );
}

