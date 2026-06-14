'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from '@/lib/reports';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Prisma } from '@prisma/client';

export async function getAccounts() {
  return db.account.findMany({
    include: {
      _count: {
        select: { transactions: true }
      }
    },
    orderBy: { name: 'asc' }
  });
}

export async function getAccountsWithBalances() {
  const accounts = await db.account.findMany({
    include: {
      _count: {
        select: { transactions: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Group by accountId and sum transaction amounts
  const txSums = await db.transaction.groupBy({
    by: ['accountId'],
    where: {
      date: {
        lte: lastDay
      }
    },
    _sum: {
      amount: true
    }
  });

  const transactionSums: Record<string, number> = {};
  for (const sum of txSums) {
    if (sum.accountId) {
      transactionSums[sum.accountId] = sum._sum.amount || 0;
    }
  }

  // Query the latest transaction date per account
  const maxTxDates = await db.transaction.groupBy({
    by: ['accountId'],
    _max: {
      date: true
    }
  });

  const lastTxDates: Record<string, string | null> = {};
  for (const item of maxTxDates) {
    if (item.accountId) {
      lastTxDates[item.accountId] = item._max.date ? new Date(item._max.date).toISOString().split('T')[0] : null;
    }
  }

  const accountsWithBalances = accounts.map((account) => {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      startingBalance: account.startingBalance,
      currency: account.currency,
      _count: account._count,
    };
  });

  return {
    accounts: accountsWithBalances,
    transactionSums,
    lastTxDates,
  };
}

export async function createAccount(name: string, type: 'ASSET' | 'LIABILITY', startingBalance: number, currency: string = 'AUD') {
  if (!name.trim()) throw new Error('ERR_ACCOUNT_NAME_REQUIRED');

  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedCurrency || !SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
    throw new Error('ERR_INVALID_CURRENCY');
  }

  const account = await db.account.create({
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: normalizedCurrency,
    }
  });

  revalidatePath('/accounts');
  revalidatePath('/import');
  revalidatePath('/reports');
  revalidatePath('/transactions');
  revalidatePath('/');
  return account;
}

export async function deleteAccount(id: string) {
  const existing = await db.account.findUnique({ where: { id } });
  if (!existing) throw new Error('ERR_ACCOUNT_NOT_FOUND');

  await db.account.delete({ where: { id } });
  revalidatePath('/accounts');
  revalidatePath('/import');
  revalidatePath('/reports');
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function updateAccount(
  id: string,
  name: string,
  type: 'ASSET' | 'LIABILITY',
  startingBalance: number,
  currency: string = 'AUD'
) {
  if (!name.trim()) throw new Error('ERR_ACCOUNT_NAME_REQUIRED');

  const existing = await db.account.findUnique({ where: { id } });
  if (!existing) throw new Error('ERR_ACCOUNT_NOT_FOUND');

  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedCurrency || !SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
    throw new Error('ERR_INVALID_CURRENCY');
  }

  const account = await db.account.update({
    where: { id },
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: normalizedCurrency,
    },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  revalidatePath('/accounts');
  revalidatePath('/import');
  revalidatePath('/reports');
  revalidatePath('/transactions');
  revalidatePath('/');
  return account;
}

export async function getCategories() {
  return db.category.findMany({
    include: {
      rules: true
    },
    orderBy: { name: 'asc' }
  });
}

export async function createCategoryRule(pattern: string, categoryId: string) {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) throw new Error('ERR_PATTERN_REQUIRED');

  // Validate the category exists
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');

  const storedPattern = trimmedPattern;
  const lowerPattern = storedPattern.toLowerCase();

  // Check for duplicate patterns within the same category (case-insensitive)
  const sameCategoryRules = await db.categoryRule.findMany({
    where: { categoryId }
  });
  const sameCategoryMatch = sameCategoryRules.find(
    (r) => r.pattern.toLowerCase() === lowerPattern
  );
  if (sameCategoryMatch) throw new Error('ERR_DUPLICATE_RULE_PATTERN');

  // Check for same pattern in a different category (first-match-wins ambiguity)
  const otherCategoryRules = await db.categoryRule.findMany({
    where: { NOT: { categoryId } },
    include: { category: { select: { name: true } } },
  });
  const conflictingRule = otherCategoryRules.find(
    (r) => r.pattern.toLowerCase() === lowerPattern
  );
  if (conflictingRule) {
    throw new Error(`ERR_DUPLICATE_RULE_PATTERN_GLOBAL:::${conflictingRule.category.name}`);
  }

  const rule = await db.categoryRule.create({
    data: {
      pattern: storedPattern,
      categoryId
    }
  });

  // Automatically categorize existing uncategorized transactions matching this new rule
  const transactions = await db.transaction.findMany({
    where: { categoryId: null }
  });

  const matchedTxIds = transactions
    .filter((tx) => {
      const cleanPayee = tx.payee.toLowerCase();
      const cleanDesc = tx.description ? tx.description.toLowerCase() : '';
      return cleanPayee.includes(lowerPattern) || cleanDesc.includes(lowerPattern);
    })
    .map((tx) => tx.id);

  if (matchedTxIds.length > 0) {
    await db.transaction.updateMany({
      where: { id: { in: matchedTxIds } },
      data: {
        categoryId,
        isReviewed: true
      }
    });
  }

  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
  return rule;
}

export async function deleteCategoryRule(id: string) {
  const rule = await db.categoryRule.findUnique({ where: { id } });
  if (!rule) throw new Error('ERR_CATEGORY_RULE_NOT_FOUND');

  await db.categoryRule.delete({
    where: { id }
  });
  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function getTransactions(
  paramsOrAccountId?: string | {
    accountId?: string;
    categoryId?: string;
    searchTerm?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateRange?: string;
    isReviewed?: boolean;
    startDateStr?: string;
    endDateStr?: string;
    currency?: string;
    categoryName?: string;
    cashFlowSection?: 'operating' | 'investing' | 'financing';
    cashFlowType?: 'inflow' | 'outflow';
  }
) {
  let accountId: string | undefined;
  let categoryId: string | undefined;
  let searchTerm: string | undefined;
  let page: number | undefined;
  let pageSize: number | undefined;
  let sortBy: string | undefined;
  let sortOrder: 'asc' | 'desc' | undefined;
  let dateRange: string | undefined;
  let isReviewed: boolean | undefined;
  let startDateStr: string | undefined;
  let endDateStr: string | undefined;
  let currency: string | undefined;
  let categoryName: string | undefined;
  let cashFlowSection: 'operating' | 'investing' | 'financing' | undefined;
  let cashFlowType: 'inflow' | 'outflow' | undefined;

  if (typeof paramsOrAccountId === 'string') {
    accountId = paramsOrAccountId;
  } else if (paramsOrAccountId) {
    accountId = paramsOrAccountId.accountId;
    categoryId = paramsOrAccountId.categoryId;
    searchTerm = paramsOrAccountId.searchTerm;
    page = paramsOrAccountId.page;
    pageSize = paramsOrAccountId.pageSize;
    sortBy = paramsOrAccountId.sortBy;
    sortOrder = paramsOrAccountId.sortOrder;
    dateRange = paramsOrAccountId.dateRange;
    isReviewed = paramsOrAccountId.isReviewed;
    startDateStr = paramsOrAccountId.startDateStr;
    endDateStr = paramsOrAccountId.endDateStr;
    currency = paramsOrAccountId.currency;
    categoryName = paramsOrAccountId.categoryName;
    cashFlowSection = paramsOrAccountId.cashFlowSection;
    cashFlowType = paramsOrAccountId.cashFlowType;
  }

  const where: Prisma.TransactionWhereInput = {};
  if (accountId) {
    where.accountId = accountId;
  }
  if (categoryId) {
    if (categoryId === 'UNCATEGORIZED') {
      where.categoryId = null;
    } else {
      where.categoryId = categoryId;
    }
  }
  if (isReviewed !== undefined) {
    where.isReviewed = isReviewed;
  }
  if (searchTerm) {
    const cleanSearch = searchTerm.trim().toLowerCase();
    // SQLite: Prisma's `contains` is case-sensitive; use raw SQL with LOWER() for case-insensitive matching
    const matchingIds = await db.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM "Transaction" WHERE LOWER("payee") LIKE ${'%' + cleanSearch + '%'} OR (description IS NOT NULL AND LOWER("description") LIKE ${'%' + cleanSearch + '%'})`
    );
    where.id = { in: matchingIds.map(t => t.id) };
  }
  if (dateRange && dateRange !== 'allPeriods') {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    if (dateRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateRange === 'threeMonths') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);
    } else if (dateRange === 'sixMonths') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
    } else if (dateRange === 'twelveMonths') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate(), 0, 0, 0, 0);
    } else if (dateRange === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    if (startDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }
  } else if (startDateStr || endDateStr) {
    // NOTE: Date boundary semantics
    //   `new Date(startDateStr)` with YYYY-MM-DD is parsed as UTC midnight.
    //   `new Date(endDateStr).setHours(23,59,59,999)` sets the end to local time 23:59:59.999.
    //   This mixed UTC/local approach is consistent with the frontend's ISO date strings,
    //   but the actual cutoff depends on the server's timezone. For a UTC server, a user
    //   at UTC+10 will see dates ending at 10:00 UTC the next day. This is a known limitation
    //   of date-range filtering without full timezone awareness.
    where.date = {
      ...(startDateStr ? { gte: new Date(startDateStr) } : {}),
      ...(endDateStr ? { lte: new Date(new Date(endDateStr).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  if (currency) {
    where.account = {
      ...((where.account ?? {}) as Prisma.AccountWhereInput),
      currency: currency.toUpperCase(),
    };
  }

  if (categoryName) {
    if (categoryName === 'Uncategorized') {
      where.categoryId = null;
    } else {
      where.category = {
        ...((where.category ?? {}) as Prisma.CategoryWhereInput),
        name: categoryName,
      };
    }
  }

  if (cashFlowSection) {
    where.category = {
      ...((where.category ?? {}) as Prisma.CategoryWhereInput),
      cashFlowType: cashFlowSection.toUpperCase(),
      NOT: {
        type: 'TRANSFER',
      },
    };
    if (cashFlowType === 'inflow') {
      (where as Record<string, unknown>).amount = { gt: 0 } satisfies Prisma.FloatFilter;
    } else if (cashFlowType === 'outflow') {
      (where as Record<string, unknown>).amount = { lt: 0 } satisfies Prisma.FloatFilter;
    }
  }

  const totalCount = await db.transaction.count({ where });

  const VALID_SORT_FIELDS = ['date', 'payee', 'amount'];
  const VALID_SORT_RELATIONS = ['account', 'category'];

  let orderBy: Prisma.TransactionOrderByWithRelationInput = { date: 'desc' };
  const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;
  if (sortBy && validSortOrder) {
    if (sortBy === 'account') {
      orderBy = { account: { name: validSortOrder } };
    } else if (sortBy === 'category') {
      orderBy = { category: { name: validSortOrder } };
    } else if (VALID_SORT_FIELDS.includes(sortBy)) {
      orderBy = { [sortBy]: validSortOrder };
    }
    // Invalid sortBy or sortOrder falls through to default { date: 'desc' }
  }

  const transactions = await db.transaction.findMany({
    where,
    include: {
      account: true,
      category: true,
    },
    orderBy,
    ...(page && pageSize ? {
      skip: (page - 1) * pageSize,
      take: pageSize
    } : {})
  });

  return {
    transactions,
    totalCount
  };
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null,
  createGlobalRule: boolean = false
) {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) throw new Error('ERR_TRANSACTION_NOT_FOUND');

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId,
      isReviewed: categoryId !== null
    },
    include: { category: true, account: true }
  });

  if (createGlobalRule && categoryId && transaction.payee) {
    // Generate a simple rule matching this merchant
    const pattern = transaction.payee.trim().toLowerCase();
    
    // Check if rule already exists to prevent duplicates
    const existingRule = await db.categoryRule.findFirst({
      where: { pattern, categoryId }
    });

    if (!existingRule) {
      await createCategoryRule(pattern, categoryId);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/reports');
  revalidatePath('/');
  return updated;
}

export async function bulkUpdateTransactionsCategory(
  transactionIds: string[],
  categoryId: string | null
) {
  const updated = await db.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: {
      categoryId,
      isReviewed: categoryId !== null
    }
  });

  revalidatePath('/transactions');
  revalidatePath('/reports');
  revalidatePath('/');
  return updated;
}

export async function getFinancialReports(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const accountsList = await db.account.findMany();
  
  const rangeTransactionsList = await db.transaction.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      category: true,
      account: true,
    }
  });

  // Fetch the aggregate sum of transaction amounts up to endDate for each account for the Balance Sheet
  const balanceSums = await db.transaction.groupBy({
    by: ['accountId'],
    where: {
      date: {
        lte: endDate
      }
    },
    _sum: {
      amount: true
    }
  });

  const balanceSheetTransactions = balanceSums.map((sum) => {
    const account = accountsList.find(a => a.id === sum.accountId);
    if (!account) {
      console.warn(`[actions] Balance sheet aggregation found accountId "${sum.accountId}" not in accounts list. Defaulting currency to AUD.`);
    }
    return {
      id: `bs-summary-${sum.accountId}`,
      date: endDate,
      amount: sum._sum.amount || 0,
      accountId: sum.accountId,
      categoryId: null,
      category: null,
      account: {
        currency: account?.currency || 'AUD'
      },
    };
  });

  // Format Decimal/Float equivalents for calculators
  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  }));

  const mappedTransactions = rangeTransactionsList.map((t) => ({
    id: t.id,
    date: new Date(t.date),
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

  const mappedBSTransactions = balanceSheetTransactions.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account.currency,
    categoryId: t.categoryId,
    category: null,
  }));

  const balanceSheet = generateBalanceSheet(mappedAccounts, mappedBSTransactions, endDate);
  const incomeStatement = generateIncomeStatement(mappedTransactions, startDate, endDate);
  const cashFlowStatement = generateCashFlowStatement(mappedTransactions, startDate, endDate);

  return {
    balanceSheet,
    incomeStatement,
    cashFlowStatement,
  };
}

export async function resetDatabase() {
  await db.$transaction([
    db.session.deleteMany(),
    db.passKeyCredential.deleteMany(),
    db.categoryRule.deleteMany(),
    db.transaction.deleteMany(),
    db.category.deleteMany(),
    db.account.deleteMany()
  ]);
  
  revalidatePath('/');
  revalidatePath('/accounts');
  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/reports');
  revalidatePath('/import');
}

export async function createCategory(name: string, type: string, cashFlowType: string) {
  if (!name.trim()) throw new Error('ERR_CATEGORY_NAME_REQUIRED');
  
  // Verify unique name
  const existing = await db.category.findUnique({
    where: { name: name.trim() }
  });
  if (existing) throw new Error('ERR_CATEGORY_NAME_EXISTS');

  const category = await db.category.create({
    data: {
      name: name.trim(),
      type,
      cashFlowType,
    }
  });

  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
  return category;
}

export async function deleteCategory(id: string) {
  const category = await db.category.findUnique({
    where: { id }
  });
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  
  if (category.type === 'TRANSFER') {
    throw new Error('ERR_TRANSFER_CATEGORY_PROTECTED');
  }

  await db.category.delete({
    where: { id }
  });

  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function updateCategory(id: string, name: string, type: string, cashFlowType: string) {
  if (!name.trim()) throw new Error('ERR_CATEGORY_NAME_REQUIRED');

  // Verify unique name
  const existing = await db.category.findFirst({
    where: {
      name: name.trim(),
      NOT: { id }
    }
  });
  if (existing) throw new Error('ERR_CATEGORY_NAME_EXISTS');

  // Protect Transfer category from modification
  const category = await db.category.findUnique({
    where: { id }
  });
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  if (category.type === 'TRANSFER') {
    throw new Error('ERR_TRANSFER_CATEGORY_PROTECTED');
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      name: name.trim(),
      type,
      cashFlowType,
    }
  });

  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
  return updated;
}

export async function getDatabaseInfo() {
  const fs = await import('fs');
  const path = await import('path');
  
  const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');
  let fileSize = 0;
  let lastModified = new Date();
  
  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      fileSize = stats.size;
      lastModified = stats.mtime;
    }
  } catch (e) {
    console.error('Error reading DB stats:', e);
  }

  let schemaVersion = '20260609000000_init';
  try {
    const migrations: any[] = await db.$queryRawUnsafe(
      'SELECT migration_name FROM _prisma_migrations ORDER BY applied_steps_count DESC LIMIT 1'
    );
    if (migrations && migrations.length > 0) {
      schemaVersion = migrations[0].migration_name;
    }
  } catch (e) {
    // Fallback
  }

  const lastTx = await db.transaction.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const lastImportTimestamp = lastTx ? lastTx.createdAt.toISOString() : null;

  return {
    fileSize,
    lastModified: lastModified.toISOString(),
    schemaVersion,
    lastImportTimestamp,
  };
}

export async function vacuumDatabase() {
  await db.$executeRawUnsafe('VACUUM');
  revalidatePath('/settings');
}

export async function exportAllTransactions() {
  return db.transaction.findMany({
    include: {
      account: true,
      category: true,
    },
    orderBy: { date: 'asc' }
  });
}

export async function exportAllAccounts() {
  return db.account.findMany({
    orderBy: { name: 'asc' }
  });
}


