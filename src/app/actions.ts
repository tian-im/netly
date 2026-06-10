'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from '@/lib/reports';

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
  
  const account = await db.account.create({
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: currency.trim().toUpperCase(),
    }
  });

  revalidatePath('/import');
  revalidatePath('/reports');
  revalidatePath('/transactions');
  revalidatePath('/');
  return account;
}

export async function deleteAccount(id: string) {
  await db.account.delete({
    where: { id }
  });
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

  const account = await db.account.update({
    where: { id },
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: currency.trim().toUpperCase(),
    }
  });

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
  if (!pattern.trim()) throw new Error('ERR_PATTERN_REQUIRED');

  const rule = await db.categoryRule.create({
    data: {
      pattern: pattern.trim().toLowerCase(),
      categoryId
    }
  });

  // Automatically categorize existing uncategorized transactions matching this new rule
  const transactions = await db.transaction.findMany({
    where: { categoryId: null }
  });

  const lowerPattern = pattern.trim().toLowerCase();
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
  }

  const where: any = {};
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
    where.OR = [
      { payee: { contains: cleanSearch } },
      { description: { contains: cleanSearch } }
    ];
  }
  if (dateRange && dateRange !== 'allPeriods') {
    const now = new Date();
    let startDate: Date | undefined;
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    if (dateRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate.setMonth(now.getMonth() + 1);
      endDate.setDate(0);
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
  }

  const totalCount = await db.transaction.count({ where });

  let orderBy: any = { date: 'desc' };
  if (sortBy && sortOrder) {
    if (sortBy === 'account') {
      orderBy = { account: { name: sortOrder } };
    } else if (sortBy === 'category') {
      orderBy = { category: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }
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
  
  const transactionsList = await db.transaction.findMany({
    include: {
      category: true,
      account: true,
    }
  });

  // Format Decimal/Float equivalents for calculators
  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  }));

  const mappedTransactions = transactionsList.map((t) => ({
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

  const balanceSheet = generateBalanceSheet(mappedAccounts, mappedTransactions, endDate);
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
  
  if (category.name.toLowerCase() === 'transfer') {
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

  // Protect Transfer category from being renamed
  const category = await db.category.findUnique({
    where: { id }
  });
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  if (category.name.toLowerCase() === 'transfer' && name.trim().toLowerCase() !== 'transfer') {
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


