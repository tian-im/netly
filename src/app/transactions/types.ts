import { Prisma } from '@prisma/client';

export type Account = Prisma.AccountGetPayload<{
  include: { _count: { select: { transactions: true } } };
}>;

export type Category = Prisma.CategoryGetPayload<{
  include: { rules: true };
}>;

export type Transaction = Prisma.TransactionGetPayload<{
  include: { account: true; category: true };
}>;

export interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
