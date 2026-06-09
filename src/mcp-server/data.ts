import { db } from "@/lib/db";

/**
 * Shared utility to fetch and map account & transaction data.
 * This is used across reports, accounts, and other analysis tools to query
 * active data and format it into clean representations for calculations.
 */
export async function fetchAndMapData() {
  const accountsList = await db.account.findMany();
  const transactionsList = await db.transaction.findMany({
    include: { account: true, category: true },
  });

  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  }));

  const mappedTransactions = transactionsList.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account.currency,
    categoryId: t.categoryId,
    category: t.category ? {
      id: t.category.id,
      name: t.category.name,
      type: t.category.type,
      cashFlowType: t.category.cashFlowType,
    } : null,
  }));

  return { mappedAccounts, mappedTransactions };
}
