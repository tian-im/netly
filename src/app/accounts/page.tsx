import { getAccounts, getTransactions } from '../actions';
import AccountsClient from './accounts-client';

export const revalidate = 0; // Disable caching so accounts manager is always up-to-date

export default async function AccountsPage() {
  const accountsList = await getAccounts();
  const transactionsList = await getTransactions();

  // Map Decimal/Prisma equivalents to serializable types
  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
    _count: a._count,
  }));

  const mappedTransactions = transactionsList.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account.currency,
    category: t.category ? {
      name: t.category.name,
      type: t.category.type,
    } : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          Accounts Manager
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          Create, view, and delete your local asset and liability ledger accounts.
        </p>
      </div>

      <AccountsClient
        initialAccounts={mappedAccounts}
        initialTransactions={mappedTransactions}
      />
    </div>
  );
}
