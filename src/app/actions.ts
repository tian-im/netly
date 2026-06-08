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

export async function createAccount(name: string, type: 'ASSET' | 'LIABILITY', startingBalance: number) {
  if (!name.trim()) throw new Error('Account name is required');
  
  const account = await db.account.create({
    data: {
      name: name.trim(),
      type,
      startingBalance,
    }
  });

  revalidatePath('/');
  return account;
}

export async function deleteAccount(id: string) {
  await db.account.delete({
    where: { id }
  });
  revalidatePath('/');
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

  revalidatePath('/');
  return rule;
}

export async function deleteCategoryRule(id: string) {
  await db.categoryRule.delete({
    where: { id }
  });
  revalidatePath('/');
}

export async function getTransactions(accountId?: string) {
  return db.transaction.findMany({
    where: accountId ? { accountId } : {},
    include: {
      account: true,
      category: true,
    },
    orderBy: { date: 'desc' }
  });
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

  revalidatePath('/');
  return updated;
}

export async function getFinancialReports(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const accountsList = await db.account.findMany();
  
  const transactionsList = await db.transaction.findMany({
    include: {
      category: true
    }
  });

  // Format Decimal/Float equivalents for calculators
  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
  }));

  const mappedTransactions = transactionsList.map((t) => ({
    id: t.id,
    date: new Date(t.date),
    amount: t.amount,
    accountId: t.accountId,
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
}
