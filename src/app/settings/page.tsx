import { db } from '@/lib/db';
import SettingsClient from './settings-client';

export const revalidate = 0; // Disable cache so settings page metrics are always live

export default async function SettingsPage() {
  const accountsCount = await db.account.count();
  const transactionsCount = await db.transaction.count();
  const rulesCount = await db.categoryRule.count();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          System Settings
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          Manage local database configurations and monitor stored transaction metadata.
        </p>
      </div>

      <SettingsClient
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        rulesCount={rulesCount}
      />
    </div>
  );
}
