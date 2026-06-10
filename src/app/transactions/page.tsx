import { getTransactions, getAccounts, getCategories } from '../actions';
import TransactionsClient from './transactions-client';

export const revalidate = 0; // Always fresh

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
  };
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const page = searchParams.page ? Math.max(1, parseInt(searchParams.page, 10) || 1) : 1;
  const pageSize = searchParams.pageSize ? Math.max(1, parseInt(searchParams.pageSize, 10) || 25) : 25;
  const sortBy = searchParams.sortBy || 'date';
  const sortOrder = searchParams.sortOrder || 'desc';
  const accountId = searchParams.accountId || undefined;
  const categoryId = searchParams.categoryId || undefined;
  const searchTerm = searchParams.searchTerm || undefined;
  const dateRange = searchParams.dateRange || undefined;
  const isReviewed = searchParams.isReviewed === 'true' ? true : searchParams.isReviewed === 'false' ? false : undefined;

  const { transactions, totalCount } = await getTransactions({
    accountId,
    categoryId,
    searchTerm,
    page,
    pageSize,
    sortBy,
    sortOrder,
    dateRange,
    isReviewed,
  });

  const accounts = await getAccounts();
  const categories = await getCategories();

  // Safely serialize Dates to ISO string format for Next.js Client Component compatibility
  const serializedTransactions = JSON.parse(JSON.stringify(transactions));
  const serializedAccounts = JSON.parse(JSON.stringify(accounts));
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <TransactionsClient
      initialTransactions={serializedTransactions}
      initialTotalCount={totalCount}
      initialAccounts={serializedAccounts}
      initialCategories={serializedCategories}
    />
  );
}
