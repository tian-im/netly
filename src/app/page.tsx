import { db } from '@/lib/db';
import { getAccounts, getTransactions } from './actions';
import DashboardClient from './dashboard-client';
import { mapTransactionForClient } from '@/lib/reports';

export const revalidate = 0; // Disable caching so dashboard is always up-to-date

export default async function DashboardPage() {
  const accountsList = await getAccounts();
  const { transactions: transactionsList } = await getTransactions();
  const uncategorizedCount = await db.transaction.count({ where: { categoryId: null } });

  // Map Decimal/Prisma equivalents to serializable types
  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
    _count: a._count,
  }));

  const mappedTransactions = transactionsList.map(mapTransactionForClient);

  return (
    <DashboardClient
      initialAccounts={mappedAccounts}
      initialTransactions={mappedTransactions}
      uncategorizedCount={uncategorizedCount}
    />
  );
}
