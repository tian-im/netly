import { getAccountsWithBalances } from '../actions';
import AccountsClient from './accounts-client';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const { accounts, transactionSums, lastTxDates } = await getAccountsWithBalances();

  return (
    <AccountsClient
      initialAccounts={accounts}
      initialTransactionSums={transactionSums}
      initialLastTxDates={lastTxDates}
    />
  );
}
