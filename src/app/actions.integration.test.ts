/**
 * Integration tests for src/app/actions.ts
 *
 * These tests exercise every server action against a real SQLite database
 * (prisma/test.db) — distinct from the dev database — so they cover the full
 * Prisma ORM ↔ SQLite layer without any mocks beyond Next.js server internals.
 *
 * Isolation strategy:
 *   - beforeEach wipes all tables so every test starts from an empty state.
 *   - afterAll disconnects Prisma.
 *   - The DATABASE_URL env var is overridden by vitest.integration.config.ts
 *     to point at prisma/test.db.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getTestDb, clearTestDb, disconnectTestDb } from '@/lib/test-db';

// ─── Mock Next.js server-only APIs ────────────────────────────────────────────
// `revalidatePath` is a no-op in tests; `'use server'` is just a directive string.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ─── Import actions AFTER mocking so they pick up the mock ────────────────────
// We also need to redirect the `db` import inside actions.ts to the test client.
// We do this by mocking the db module to export our test client instance.
vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

import {
  getAccounts,
  createAccount,
  deleteAccount,
  getCategories,
  createCategory,
  deleteCategory,
  createCategoryRule,
  deleteCategoryRule,
  getTransactions,
  updateTransactionCategory,
  getFinancialReports,
  resetDatabase,
} from '@/app/actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const db = getTestDb();

async function seedAccount(overrides: Partial<{
  name: string; type: 'ASSET' | 'LIABILITY'; startingBalance: number; currency: string;
}> = {}) {
  return db.account.create({
    data: {
      name: overrides.name ?? 'Test Checking',
      type: overrides.type ?? 'ASSET',
      startingBalance: overrides.startingBalance ?? 0,
      currency: overrides.currency ?? 'AUD',
    },
  });
}

async function seedCategory(overrides: Partial<{
  name: string; type: string; cashFlowType: string;
}> = {}) {
  return db.category.create({
    data: {
      name: overrides.name ?? 'Groceries',
      type: overrides.type ?? 'EXPENSE',
      cashFlowType: overrides.cashFlowType ?? 'OPERATING',
    },
  });
}

async function seedTransaction(accountId: string, overrides: Partial<{
  payee: string; amount: number; description: string | null;
  categoryId: string | null; isReviewed: boolean;
}> = {}) {
  return db.transaction.create({
    data: {
      date: new Date('2026-06-01'),
      payee: overrides.payee ?? 'Woolworths',
      description: overrides.description ?? null,
      amount: overrides.amount ?? -50,
      accountId,
      categoryId: overrides.categoryId ?? null,
      isReviewed: overrides.isReviewed ?? false,
    },
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accounts
// ═══════════════════════════════════════════════════════════════════════════════

describe('Account actions', () => {
  describe('getAccounts', () => {
    it('returns an empty list when no accounts exist', async () => {
      const result = await getAccounts();
      expect(result).toEqual([]);
    });

    it('returns accounts ordered by name ascending', async () => {
      await seedAccount({ name: 'Zebra Account' });
      await seedAccount({ name: 'Alpha Account' });
      const result = await getAccounts();
      expect(result.map((a) => a.name)).toEqual(['Alpha Account', 'Zebra Account']);
    });

    it('includes transaction count', async () => {
      const account = await seedAccount();
      await seedTransaction(account.id);
      const result = await getAccounts();
      expect(result[0]._count.transactions).toBe(1);
    });
  });

  describe('createAccount', () => {
    it('creates an account with correct fields', async () => {
      const account = await createAccount('My Savings', 'ASSET', 1000, 'USD');
      expect(account.name).toBe('My Savings');
      expect(account.type).toBe('ASSET');
      expect(account.startingBalance).toBe(1000);
      expect(account.currency).toBe('USD');
    });

    it('trims whitespace from name', async () => {
      const account = await createAccount('  Padded Name  ', 'ASSET', 0);
      expect(account.name).toBe('Padded Name');
    });

    it('upcases the currency code', async () => {
      const account = await createAccount('Card', 'LIABILITY', 0, 'aud');
      expect(account.currency).toBe('AUD');
    });

    it('defaults currency to AUD', async () => {
      const account = await createAccount('Default Currency', 'ASSET', 0);
      expect(account.currency).toBe('AUD');
    });

    it('throws when name is blank', async () => {
      await expect(createAccount('   ', 'ASSET', 0)).rejects.toThrow('Account name is required');
    });
  });

  describe('deleteAccount', () => {
    it('deletes an existing account', async () => {
      const account = await seedAccount();
      await deleteAccount(account.id);
      const found = await db.account.findUnique({ where: { id: account.id } });
      expect(found).toBeNull();
    });

    it('cascades deletion to child transactions', async () => {
      const account = await seedAccount();
      const tx = await seedTransaction(account.id);
      await deleteAccount(account.id);
      const foundTx = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(foundTx).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════════════════════════════════════════

describe('Category actions', () => {
  describe('getCategories', () => {
    it('returns an empty list when no categories exist', async () => {
      expect(await getCategories()).toEqual([]);
    });

    it('returns categories ordered by name, including rules', async () => {
      const z = await seedCategory({ name: 'Zzz' });
      const a = await seedCategory({ name: 'Aaa' });
      await db.categoryRule.create({ data: { pattern: 'test', categoryId: a.id } });

      const result = await getCategories();
      expect(result[0].name).toBe('Aaa');
      expect(result[0].rules).toHaveLength(1);
      expect(result[1].name).toBe('Zzz');
    });
  });

  describe('createCategory', () => {
    it('creates a category with correct fields', async () => {
      const cat = await createCategory('Rent', 'EXPENSE', 'OPERATING');
      expect(cat.name).toBe('Rent');
      expect(cat.type).toBe('EXPENSE');
      expect(cat.cashFlowType).toBe('OPERATING');
    });

    it('trims whitespace from name', async () => {
      const cat = await createCategory('  Salary  ', 'INCOME', 'OPERATING');
      expect(cat.name).toBe('Salary');
    });

    it('throws when name is blank', async () => {
      await expect(createCategory('', 'EXPENSE', 'OPERATING')).rejects.toThrow(
        'Category name is required'
      );
    });

    it('throws when duplicate name is used', async () => {
      await createCategory('Groceries', 'EXPENSE', 'OPERATING');
      await expect(createCategory('Groceries', 'EXPENSE', 'OPERATING')).rejects.toThrow(
        'Category with this name already exists'
      );
    });
  });

  describe('deleteCategory', () => {
    it('deletes an existing category', async () => {
      const cat = await seedCategory({ name: 'ToDelete' });
      await deleteCategory(cat.id);
      const found = await db.category.findUnique({ where: { id: cat.id } });
      expect(found).toBeNull();
    });

    it('throws when category does not exist', async () => {
      await expect(deleteCategory('nonexistent-id')).rejects.toThrow('Category not found');
    });

    it('throws when trying to delete the protected Transfer category', async () => {
      const cat = await seedCategory({ name: 'Transfer', type: 'TRANSFER' });
      await expect(deleteCategory(cat.id)).rejects.toThrow('protected');
    });

    it('sets transactions to Uncategorized when parent category is deleted', async () => {
      const account = await seedAccount();
      const cat = await seedCategory({ name: 'Deletable' });
      const tx = await seedTransaction(account.id, { categoryId: cat.id });

      await deleteCategory(cat.id);

      const updatedTx = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(updatedTx?.categoryId).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Category Rules
// ═══════════════════════════════════════════════════════════════════════════════

describe('Category Rule actions', () => {
  describe('createCategoryRule', () => {
    it('creates a rule and lowercases the pattern', async () => {
      const cat = await seedCategory();
      const rule = await createCategoryRule('Woolworths', cat.id);
      expect(rule.pattern).toBe('woolworths');
      expect(rule.categoryId).toBe(cat.id);
    });

    it('throws when pattern is blank', async () => {
      const cat = await seedCategory();
      await expect(createCategoryRule('  ', cat.id)).rejects.toThrow('Pattern is required');
    });

    it('auto-categorizes existing uncategorized transactions that match the new rule', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      // Uncategorized transaction whose payee matches the rule
      const tx = await seedTransaction(account.id, { payee: 'Woolworths Metro', categoryId: null });

      await createCategoryRule('woolworths', cat.id);

      const updated = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(updated?.categoryId).toBe(cat.id);
      expect(updated?.isReviewed).toBe(true);
    });

    it('auto-categorizes via description match as well', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id, {
        payee: 'POS PURCHASE',
        description: 'Payment to Coles Supermarket',
        categoryId: null,
      });

      await createCategoryRule('coles', cat.id);

      const updated = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(updated?.categoryId).toBe(cat.id);
    });

    it('does not affect already-categorized transactions', async () => {
      const account = await seedAccount();
      const cat = await seedCategory({ name: 'Groceries' });
      const otherCat = await seedCategory({ name: 'Other' });

      const tx = await seedTransaction(account.id, {
        payee: 'Woolworths',
        categoryId: otherCat.id,
        isReviewed: true,
      });

      await createCategoryRule('woolworths', cat.id);

      const unchanged = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(unchanged?.categoryId).toBe(otherCat.id);
    });
  });

  describe('deleteCategoryRule', () => {
    it('deletes a rule by id', async () => {
      const cat = await seedCategory();
      const rule = await db.categoryRule.create({
        data: { pattern: 'uber', categoryId: cat.id },
      });
      await deleteCategoryRule(rule.id);
      const found = await db.categoryRule.findUnique({ where: { id: rule.id } });
      expect(found).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Transactions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Transaction actions', () => {
  describe('getTransactions', () => {
    it('returns an empty list when no transactions exist', async () => {
      expect((await getTransactions()).transactions).toEqual([]);
    });

    it('returns all transactions ordered by date descending', async () => {
      const account = await seedAccount();
      await db.transaction.create({
        data: { date: new Date('2026-01-01'), payee: 'Old', amount: -10, accountId: account.id },
      });
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'New', amount: -20, accountId: account.id },
      });

      const { transactions: result } = await getTransactions();
      expect(result[0].payee).toBe('New');
      expect(result[1].payee).toBe('Old');
    });

    it('filters by accountId when provided', async () => {
      const acc1 = await seedAccount({ name: 'Acc1' });
      const acc2 = await seedAccount({ name: 'Acc2' });
      await seedTransaction(acc1.id, { payee: 'Tx for Acc1' });
      await seedTransaction(acc2.id, { payee: 'Tx for Acc2' });

      const { transactions: result } = await getTransactions(acc1.id);
      expect(result).toHaveLength(1);
      expect(result[0].payee).toBe('Tx for Acc1');
    });

    it('includes account and category relations', async () => {
      const account = await seedAccount({ name: 'Checking' });
      const cat = await seedCategory({ name: 'Food' });
      await seedTransaction(account.id, { categoryId: cat.id });

      const { transactions: result } = await getTransactions();
      expect(result[0].account.name).toBe('Checking');
      expect(result[0].category?.name).toBe('Food');
    });

    it('supports pagination, search, and category filtering via options object', async () => {
      const account = await seedAccount();
      const cat1 = await seedCategory({ name: 'Groceries' });
      const cat2 = await seedCategory({ name: 'Entertainment' });

      await seedTransaction(account.id, { payee: 'Woolworths Metro', categoryId: cat1.id, amount: -30 });
      await seedTransaction(account.id, { payee: 'Netflix', categoryId: cat2.id, amount: -15 });
      await seedTransaction(account.id, { payee: 'Coles Express', categoryId: cat1.id, amount: -40 });
      await seedTransaction(account.id, { payee: 'Uber Ride', categoryId: null, amount: -25 });

      // Search matching payee
      const searchResult = await getTransactions({ searchTerm: 'coles' });
      expect(searchResult.totalCount).toBe(1);
      expect(searchResult.transactions[0].payee).toBe('Coles Express');

      // Category filter matching 'UNCATEGORIZED'
      const uncategorizedResult = await getTransactions({ categoryId: 'UNCATEGORIZED' });
      expect(uncategorizedResult.totalCount).toBe(1);
      expect(uncategorizedResult.transactions[0].payee).toBe('Uber Ride');

      // Category filter matching specific category ID
      const groceriesResult = await getTransactions({ categoryId: cat1.id });
      expect(groceriesResult.totalCount).toBe(2);

      // Pagination matching page and pageSize
      const paginatedResult = await getTransactions({ page: 2, pageSize: 2 });
      expect(paginatedResult.transactions).toHaveLength(2);
      expect(paginatedResult.totalCount).toBe(4);
    });
  });

  describe('updateTransactionCategory', () => {
    it('assigns a category to a transaction and marks it as reviewed', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id);

      const updated = await updateTransactionCategory(tx.id, cat.id);
      expect(updated.categoryId).toBe(cat.id);
      expect(updated.isReviewed).toBe(true);
    });

    it('clears the category and marks unreviewed when null is passed', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id, { categoryId: cat.id, isReviewed: true });

      const updated = await updateTransactionCategory(tx.id, null);
      expect(updated.categoryId).toBeNull();
      expect(updated.isReviewed).toBe(false);
    });

    it('throws when transaction does not exist', async () => {
      await expect(updateTransactionCategory('bad-id', null)).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('creates a global rule when createGlobalRule=true', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id, { payee: 'Netflix' });

      await updateTransactionCategory(tx.id, cat.id, true);

      const rule = await db.categoryRule.findFirst({ where: { categoryId: cat.id } });
      expect(rule).not.toBeNull();
      expect(rule?.pattern).toBe('netflix');
    });

    it('does NOT create a duplicate rule when one already exists for the same pattern+category', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      await db.categoryRule.create({ data: { pattern: 'netflix', categoryId: cat.id } });

      const tx = await seedTransaction(account.id, { payee: 'Netflix' });
      await updateTransactionCategory(tx.id, cat.id, true);

      const rules = await db.categoryRule.findMany({ where: { categoryId: cat.id } });
      expect(rules).toHaveLength(1);
    });

    it('does NOT create a rule when createGlobalRule=false', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id, { payee: 'Spotify' });

      await updateTransactionCategory(tx.id, cat.id, false);

      const rules = await db.categoryRule.findMany({ where: { categoryId: cat.id } });
      expect(rules).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Financial Reports
// ═══════════════════════════════════════════════════════════════════════════════

describe('getFinancialReports', () => {
  it('returns empty report structures when no data exists', async () => {
    const reports = await getFinancialReports('2026-01-01', '2026-12-31');
    expect(reports.balanceSheet.accounts).toEqual([]);
    expect(reports.incomeStatement.totals).toEqual({});
    expect(reports.cashFlowStatement.totals).toEqual({});
  });

  it('aggregates income and expenses correctly in income statement', async () => {
    const account = await seedAccount({ startingBalance: 0 });
    const salary = await seedCategory({ name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' });
    const food = await seedCategory({ name: 'Food', type: 'EXPENSE', cashFlowType: 'OPERATING' });

    await db.transaction.create({
      data: { date: new Date('2026-06-05'), payee: 'Employer', amount: 3000, accountId: account.id, categoryId: salary.id },
    });
    await db.transaction.create({
      data: { date: new Date('2026-06-10'), payee: 'Woolworths', amount: -200, accountId: account.id, categoryId: food.id },
    });

    const reports = await getFinancialReports('2026-06-01', '2026-06-30');
    const aud = reports.incomeStatement.totals['AUD'];
    expect(aud).toBeDefined();
    expect(aud.totalIncome).toBe(3000);
    expect(aud.totalExpenses).toBe(200);
    expect(aud.netIncome).toBe(2800);
  });

  it('reflects account starting balances in balance sheet', async () => {
    const account = await seedAccount({ startingBalance: 5000, type: 'ASSET' });
    const reports = await getFinancialReports('2026-01-01', '2026-12-31');

    const acc = reports.balanceSheet.accounts.find((a) => a.id === account.id);
    expect(acc?.balance).toBe(5000);
    expect(reports.balanceSheet.totals['AUD'].totalAssets).toBe(5000);
  });

  it('categorizes cash flow sections correctly (OPERATING / INVESTING / FINANCING)', async () => {
    const account = await seedAccount({ startingBalance: 0 });
    const operating = await seedCategory({ name: 'Rent', type: 'EXPENSE', cashFlowType: 'OPERATING' });
    const investing = await seedCategory({ name: 'Stocks', type: 'EXPENSE', cashFlowType: 'INVESTING' });
    const financing = await seedCategory({ name: 'Loan', type: 'EXPENSE', cashFlowType: 'FINANCING' });

    await db.transaction.createMany({
      data: [
        { date: new Date('2026-06-01'), payee: 'Landlord', amount: -1000, accountId: account.id, categoryId: operating.id },
        { date: new Date('2026-06-02'), payee: 'Broker', amount: -500, accountId: account.id, categoryId: investing.id },
        { date: new Date('2026-06-03'), payee: 'Bank', amount: -300, accountId: account.id, categoryId: financing.id },
      ],
    });

    const reports = await getFinancialReports('2026-06-01', '2026-06-30');
    const cf = reports.cashFlowStatement.totals['AUD'];
    expect(cf.operating.net).toBe(-1000);
    expect(cf.investing.net).toBe(-500);
    expect(cf.financing.net).toBe(-300);
    expect(cf.netCashFlow).toBe(-1800);
  });

  it('handles uncategorized transactions correctly without crashing', async () => {
    const account = await seedAccount();
    await seedTransaction(account.id, { payee: 'Uncategorized Spend', amount: -50, categoryId: null });
    const reports = await getFinancialReports('2026-06-01', '2026-06-30');
    // It should exist for the currency but have 0/empty totals since transaction is uncategorized
    const aud = reports.incomeStatement.totals['AUD'];
    expect(aud.totalIncome).toBe(0);
    expect(aud.totalExpenses).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Reset Database
// ═══════════════════════════════════════════════════════════════════════════════

describe('resetDatabase', () => {
  it('wipes all accounts, categories, rules and transactions', async () => {
    const account = await seedAccount();
    const cat = await seedCategory();
    await seedTransaction(account.id, { categoryId: cat.id });
    await db.categoryRule.create({ data: { pattern: 'test', categoryId: cat.id } });

    await resetDatabase();

    expect(await db.account.count()).toBe(0);
    expect(await db.category.count()).toBe(0);
    expect(await db.transaction.count()).toBe(0);
    expect(await db.categoryRule.count()).toBe(0);
  });
});

describe('getTestDb URL fallback', () => {
  it('falls back to default URL when DATABASE_URL is not set', async () => {
    const originalUrl = process.env.DATABASE_URL;
    try {
      delete process.env.DATABASE_URL;
      await disconnectTestDb();
      const client = getTestDb();
      expect(client).toBeDefined();
      await disconnectTestDb();
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  });
});

