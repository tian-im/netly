/**
 * Shape of a database transaction record as returned by Prisma's `findMany`
 * with `{ include: { account: true, category: true } }`.
 * The `currency` field is optional because some callers (e.g. test mocks)
 * include it directly, while Prisma always provides it via `account.currency`.
 */
export interface DbTransactionRecord {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  categoryId: string | null;
  currency?: string;
  account?: { currency?: string } | null;
  category?: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

/** Client-safe shape after mapping. */
export interface ClientTransaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  currency: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

/**
 * Maps a database transaction record with relationships to a clean, serializable client-friendly shape.
 */
export function mapTransactionForClient(t: DbTransactionRecord): ClientTransaction {
  return {
    id: t.id,
    date: t.date,
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account?.currency || t.currency || 'AUD',
    categoryId: t.categoryId,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          type: t.category.type,
          cashFlowType: t.category.cashFlowType,
        }
      : null,
  };
}
