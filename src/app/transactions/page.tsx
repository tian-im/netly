import { getTransactions, getAccounts, getCategories } from '../actions';
import TransactionsClient from './transactions-client';

export const revalidate = 0; // Always fresh

export default async function TransactionsPage() {
  const { transactions } = await getTransactions();
  const accounts = await getAccounts();
  const categories = await getCategories();

  // Safely serialize Dates to ISO string format for Next.js Client Component compatibility
  const serializedTransactions = JSON.parse(JSON.stringify(transactions));
  const serializedAccounts = JSON.parse(JSON.stringify(accounts));
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <TransactionsClient
      initialTransactions={serializedTransactions}
      initialAccounts={serializedAccounts}
      initialCategories={serializedCategories}
    />
  );
}
