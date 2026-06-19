import { getTransactions, getAccounts, getCategories, findDuplicateGroups } from '../actions';
import TransactionsClient from './transactions-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { mapPreferenceToTransactionPeriod } from '@/lib/dates';
import { PREFERENCES, getPreferenceFromCookies } from '@/lib/preferences';
import { buildTransactionsUrl } from '@/lib/links';

export const revalidate = 0; // Always fresh

/**
 * Safely serialize server data for client component transport.
 * Prisma returns Date objects and other non-serializable types
 * that Next.js cannot pass across the server/client boundary.
 */
function serializeForClient<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

interface PageProps {
  searchParams: {
    accountId?: string;
    categoryId?: string;
    searchTerm?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateRange?: string;
    isReviewed?: 'true' | 'false' | 'all';
    currency?: string;
    duplicates?: string;
  };
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  // WHY: Reading preferences from cookies instead of localStorage lets the server
  // pass them as props to the client, eliminating client-side getPreferredCurrency()
  // calls and avoiding a useEffect → URL-push → second-SSR cycle.
  const cookieStore = cookies();
  const preferredCurrency = getPreferenceFromCookies(cookieStore, PREFERENCES.defaultCurrency);

  const dateRange = searchParams.dateRange;
  if (dateRange === undefined) {
    // WHY: Using PREFERENCES.dateRange.key instead of a raw string keeps the cookie
    // key centralised — if the key changes in preferences.ts, this stays in sync.
    const prefRange = cookieStore.get(PREFERENCES.dateRange.key)?.value || PREFERENCES.dateRange.default;
    const defaultRange = mapPreferenceToTransactionPeriod(prefRange);

    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, val]) => {
      if (val !== undefined) params.set(key, val);
    });
    params.set('dateRange', defaultRange);
    redirect(buildTransactionsUrl(params));
  }

  const page = searchParams.page ? Math.max(1, parseInt(searchParams.page, 10) || 1) : 1;
  const pageSize = searchParams.pageSize ? Math.max(1, parseInt(searchParams.pageSize, 10) || 25) : 25;
  const sortBy = searchParams.sortBy || 'date';
  const sortOrder = searchParams.sortOrder || 'desc';
  const accountId = searchParams.accountId || undefined;
  const categoryId = searchParams.categoryId || undefined;
  const searchTerm = searchParams.searchTerm || undefined;
  const isReviewed = searchParams.isReviewed === 'true' ? true : searchParams.isReviewed === 'false' ? false : undefined;
  const currency = searchParams.currency || undefined;
  const duplicatesMode = searchParams.duplicates === 'true';

  let transactions: any[] = [];
  let totalCount = 0;
  let duplicateGroups: any[] = [];

  if (duplicatesMode) {
    const groups = await findDuplicateGroups({
      accountId,
      dateRange,
      fuzzy: false
    });
    duplicateGroups = serializeForClient(groups);
  } else {
    const res = await getTransactions({
      accountId,
      categoryId,
      searchTerm,
      page,
      pageSize,
      sortBy,
      sortOrder,
      dateRange,
      isReviewed,
      currency,
    });
    transactions = serializeForClient(res.transactions);
    totalCount = res.totalCount;
  }

  const accounts = await getAccounts();
  const categories = await getCategories();

  const serializedAccounts = serializeForClient(accounts);
  const serializedCategories = serializeForClient(categories);

  return (
    <TransactionsClient
      initialTransactions={transactions}
      initialTotalCount={totalCount}
      initialAccounts={serializedAccounts}
      initialCategories={serializedCategories}
      preferredCurrency={preferredCurrency}
      initialDuplicateGroups={duplicateGroups}
    />
  );
}
