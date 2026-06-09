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

export async function createAccount(name: string, type: 'ASSET' | 'LIABILITY', startingBalance: number, currency: string = 'AUD') {
  if (!name.trim()) throw new Error('Account name is required');
  
  const account = await db.account.create({
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: currency.trim().toUpperCase(),
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
  await db.account.delete({
    where: { id }
  });
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
  if (!name.trim()) throw new Error('Account name is required');

  const account = await db.account.update({
    where: { id },
    data: {
      name: name.trim(),
      type,
      startingBalance,
      currency: currency.trim().toUpperCase(),
    }
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
  if (!pattern.trim()) throw new Error('Pattern is required');

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
  }
) {
  let accountId: string | undefined;
  let categoryId: string | undefined;
  let searchTerm: string | undefined;
  let page: number | undefined;
  let pageSize: number | undefined;

  if (typeof paramsOrAccountId === 'string') {
    accountId = paramsOrAccountId;
  } else if (paramsOrAccountId) {
    accountId = paramsOrAccountId.accountId;
    categoryId = paramsOrAccountId.categoryId;
    searchTerm = paramsOrAccountId.searchTerm;
    page = paramsOrAccountId.page;
    pageSize = paramsOrAccountId.pageSize;
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
  if (searchTerm) {
    const cleanSearch = searchTerm.trim().toLowerCase();
    where.OR = [
      { payee: { contains: cleanSearch } },
      { description: { contains: cleanSearch } }
    ];
  }

  const totalCount = await db.transaction.count({ where });

  const transactions = await db.transaction.findMany({
    where,
    include: {
      account: true,
      category: true,
    },
    orderBy: { date: 'desc' },
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

  if (!transaction) throw new Error('Transaction not found');

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId,
      isReviewed: categoryId !== null
    },
    include: { category: true }
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
  if (!name.trim()) throw new Error('Category name is required');
  
  // Verify unique name
  const existing = await db.category.findUnique({
    where: { name: name.trim() }
  });
  if (existing) throw new Error('Category with this name already exists');

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
  if (!category) throw new Error('Category not found');
  
  if (category.name.toLowerCase() === 'transfer') {
    throw new Error('The default "Transfer" category is protected and cannot be deleted.');
  }

  await db.category.delete({
    where: { id }
  });

  revalidatePath('/categories');
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function updateCategory(id: string, name: string, type: string, cashFlowType: string) {
  if (!name.trim()) throw new Error('Category name is required');

  // Verify unique name
  const existing = await db.category.findFirst({
    where: {
      name: name.trim(),
      NOT: { id }
    }
  });
  if (existing) throw new Error('Category with this name already exists');

  // Protect Transfer category from being renamed
  const category = await db.category.findUnique({
    where: { id }
  });
  if (!category) throw new Error('Category not found');
  if (category.name.toLowerCase() === 'transfer' && name.trim().toLowerCase() !== 'transfer') {
    throw new Error('The default "Transfer" category is protected and cannot be renamed.');
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

