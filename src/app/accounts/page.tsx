import { getAccountsWithBalances } from '../actions';
import AccountsClient from './accounts-client';
import { cookies } from 'next/headers';
import { PREFERENCES, getPreferenceFromCookies } from '@/lib/preferences';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const cookieStore = cookies();
  // WHY: Reading the preferred currency from the cookie lets the server pass it
  // as a prop to the client, eliminating the client-side getPreferredCurrency() call.
  const preferredCurrency = getPreferenceFromCookies(cookieStore, PREFERENCES.defaultCurrency);
  const { accounts, transactionSums, lastTxDates } = await getAccountsWithBalances();

  return (
    <AccountsClient
      initialAccounts={accounts}
      initialTransactionSums={transactionSums}
      initialLastTxDates={lastTxDates}
      preferredCurrency={preferredCurrency}
    />
  );
}
