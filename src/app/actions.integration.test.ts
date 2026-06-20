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
  getAccountsWithBalances,
  createAccount,
  deleteAccount,
  updateAccount,
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  createCategoryRule,
  deleteCategoryRule,
  getTransactions,
  updateTransactionCategory,
  getFinancialReports,
  resetDatabase,
  getDatabaseInfo,
  vacuumDatabase,
  exportAllTransactions,
  exportAllAccounts,
  importAccounts,
  bulkUpdateTransactionsCategory,
  bulkDeleteTransactions,
  findDuplicateGroups,
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
  // Don't disconnect — test files share a single fork and disconnecting
  // would break sibling test files' module-scoped mocks.
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

  describe('getAccountsWithBalances', () => {
    it('returns empty lists when no accounts exist', async () => {
      const result = await getAccountsWithBalances();
      expect(result.accounts).toEqual([]);
      expect(result.transactionSums).toEqual({});
      expect(result.lastTxDates).toEqual({});
    });

    it('returns accounts with calculated balances', async () => {
      const acc = await seedAccount({ name: 'Checking', type: 'ASSET', startingBalance: 1000 });
      await seedTransaction(acc.id, { amount: -200 });
      await seedTransaction(acc.id, { amount: 50 });

      const result = await getAccountsWithBalances();
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].name).toBe('Checking');
      expect(result.transactionSums[acc.id]).toBe(-150);
      expect(result.lastTxDates[acc.id]).toBe('2026-06-01');
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
      await expect(createAccount('   ', 'ASSET', 0)).rejects.toThrow('ERR_ACCOUNT_NAME_REQUIRED');
    });
  });

  describe('updateAccount', () => {
    it('updates account details correctly', async () => {
      const account = await seedAccount({ name: 'Old Account', type: 'ASSET', startingBalance: 100, currency: 'AUD' });
      const updated = await updateAccount(account.id, 'New Account Name', 'LIABILITY', -50, 'USD');
      
      expect(updated.name).toBe('New Account Name');
      expect(updated.type).toBe('LIABILITY');
      expect(updated.startingBalance).toBe(-50);
      expect(updated.currency).toBe('USD');

      const found = await db.account.findUnique({ where: { id: account.id } });
      expect(found?.name).toBe('New Account Name');
      expect(found?.type).toBe('LIABILITY');
      expect(found?.startingBalance).toBe(-50);
      expect(found?.currency).toBe('USD');
    });

    it('trims whitespace and upcases currency', async () => {
      const account = await seedAccount();
      const updated = await updateAccount(account.id, '   Name Trimmed   ', 'ASSET', 0, 'eur');
      expect(updated.name).toBe('Name Trimmed');
      expect(updated.currency).toBe('EUR');
    });

    it('throws when name is blank', async () => {
      const account = await seedAccount();
      await expect(updateAccount(account.id, '   ', 'ASSET', 0)).rejects.toThrow('ERR_ACCOUNT_NAME_REQUIRED');
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

    it('throws ERR_ACCOUNT_NOT_FOUND when deleting non-existent account', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(deleteAccount(fakeId)).rejects.toThrow('ERR_ACCOUNT_NOT_FOUND');
    });
  });

  describe('updateAccount error paths', () => {
    it('throws ERR_ACCOUNT_NOT_FOUND when updating non-existent account', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(updateAccount(fakeId, 'New Name', 'ASSET', 0)).rejects.toThrow('ERR_ACCOUNT_NOT_FOUND');
    });

    it('throws error for invalid currency', async () => {
      const account = await seedAccount();
      await expect(
        updateAccount(account.id, 'New Name', 'ASSET', 0, 'INVALID')
      ).rejects.toThrow('ERR_INVALID_CURRENCY');
    });

    it('throws error for 3-letter unsupported currency code', async () => {
      const account = await seedAccount();
      await expect(
        updateAccount(account.id, 'New Name', 'ASSET', 0, 'ZZZ')
      ).rejects.toThrow('ERR_INVALID_CURRENCY');
    });
  });

  describe('createAccount error paths', () => {
    it('throws error for invalid currency', async () => {
      await expect(
        createAccount('Test', 'ASSET', 0, 'INVALID')
      ).rejects.toThrow('ERR_INVALID_CURRENCY');
    });

    it('throws error for 3-letter unsupported currency code', async () => {
      await expect(
        createAccount('Test', 'ASSET', 0, 'ZZZ')
      ).rejects.toThrow('ERR_INVALID_CURRENCY');
    });

    it('throws error for empty currency string', async () => {
      await expect(
        createAccount('Test', 'ASSET', 0, '')
      ).rejects.toThrow('ERR_INVALID_CURRENCY');
    });
  });

  describe('updateAccount _count preservation', () => {
    it('includes _count in update response', async () => {
      const account = await seedAccount();
      await seedTransaction(account.id);
      const updated = await updateAccount(account.id, 'Updated Name', 'ASSET', 0);
      expect(updated._count).toBeDefined();
      expect(updated._count?.transactions).toBe(1);
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
        'ERR_CATEGORY_NAME_REQUIRED'
      );
    });

    it('throws when duplicate name is used', async () => {
      await createCategory('Groceries', 'EXPENSE', 'OPERATING');
      await expect(createCategory('Groceries', 'EXPENSE', 'OPERATING')).rejects.toThrow(
        'ERR_CATEGORY_NAME_EXISTS'
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
      await expect(deleteCategory('nonexistent-id')).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });

    it('throws when trying to delete the protected Transfer category', async () => {
      const cat = await seedCategory({ name: 'Transfer', type: 'TRANSFER' });
      await expect(deleteCategory(cat.id)).rejects.toThrow('ERR_TRANSFER_CATEGORY_PROTECTED');
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

  describe('updateCategory', () => {
    it('updates an existing category details correctly', async () => {
      const cat = await seedCategory({ name: 'Old Name', type: 'EXPENSE', cashFlowType: 'OPERATING' });
      const updated = await updateCategory(cat.id, 'New Name', 'INCOME', 'INVESTING');

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('INCOME');
      expect(updated.cashFlowType).toBe('INVESTING');

      const found = await db.category.findUnique({ where: { id: cat.id } });
      expect(found?.name).toBe('New Name');
      expect(found?.type).toBe('INCOME');
      expect(found?.cashFlowType).toBe('INVESTING');
    });

    it('throws when name is blank', async () => {
      const cat = await seedCategory();
      await expect(updateCategory(cat.id, '  ', 'EXPENSE', 'OPERATING')).rejects.toThrow(
        'ERR_CATEGORY_NAME_REQUIRED'
      );
    });

    it('throws when duplicate name is used by another category', async () => {
      await seedCategory({ name: 'Duplicate' });
      const cat = await seedCategory({ name: 'Target' });
      await expect(updateCategory(cat.id, 'Duplicate', 'EXPENSE', 'OPERATING')).rejects.toThrow(
        'ERR_CATEGORY_NAME_EXISTS'
      );
    });

    it('throws when trying to rename the protected Transfer category', async () => {
      const cat = await seedCategory({ name: 'Transfer', type: 'TRANSFER' });
      await expect(updateCategory(cat.id, 'Something Else', 'TRANSFER', 'OPERATING')).rejects.toThrow(
        'ERR_TRANSFER_CATEGORY_PROTECTED'
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Category Rules
// ═══════════════════════════════════════════════════════════════════════════════

describe('Category Rule actions', () => {
  describe('createCategoryRule', () => {
    it('creates a rule and preserves the original casing of the pattern', async () => {
      const cat = await seedCategory();
      const rule = await createCategoryRule('Woolworths', cat.id);
      expect(rule.pattern).toBe('Woolworths');
      expect(rule.categoryId).toBe(cat.id);
    });

    it('throws when pattern is blank', async () => {
      const cat = await seedCategory();
      await expect(createCategoryRule('  ', cat.id)).rejects.toThrow('ERR_PATTERN_REQUIRED');
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
        'ERR_TRANSACTION_NOT_FOUND'
      );
    });

    it('creates a global rule when createGlobalRule=true', async () => {
      const account = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(account.id, { payee: 'Netflix' });

      await updateTransactionCategory(tx.id, cat.id, true);

      const rule = await db.categoryRule.findFirst({ where: { categoryId: cat.id } });
      expect(rule).not.toBeNull();
      // updateTransactionCategory lowercases auto-derived patterns
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
      // Existing pattern retains its original casing
      expect(rules[0].pattern).toBe('netflix');
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
    // Uncategorized transactions are excluded from income statement (they have no category)
    // so totals should be empty (no categorized transactions in range)
    expect(reports.incomeStatement.totals).toEqual({});
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

describe('System settings and backup actions', () => {
  describe('getDatabaseInfo', () => {
    it('retrieves database details successfully', async () => {
      const info = await getDatabaseInfo();
      expect(info).toBeDefined();
      expect(typeof info.fileSize).toBe('number');
      expect(typeof info.schemaVersion).toBe('string');
    });
  });

  describe('vacuumDatabase', () => {
    it('runs VACUUM query on sqlite successfully', async () => {
      await expect(vacuumDatabase()).resolves.toBeUndefined();
    });
  });

  describe('exportAllTransactions', () => {
    it('returns all transactions sorted by date ascending', async () => {
      const account = await seedAccount();
      await db.transaction.create({
        data: { date: new Date('2026-06-10'), payee: 'Later', amount: -20, accountId: account.id }
      });
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Earlier', amount: -10, accountId: account.id }
      });
      const txs = await exportAllTransactions();
      expect(txs).toHaveLength(2);
      expect(txs[0].payee).toBe('Earlier');
      expect(txs[1].payee).toBe('Later');
    });
  });

  describe('exportAllAccounts', () => {
    it('returns all accounts sorted by name ascending', async () => {
      await seedAccount({ name: 'Zeta' });
      await seedAccount({ name: 'Beta' });
      const accs = await exportAllAccounts();
      expect(accs).toHaveLength(2);
      expect(accs[0].name).toBe('Beta');
      expect(accs[1].name).toBe('Zeta');
    });
  });

  describe('importAccounts', () => {
    it('imports new accounts successfully and ignores empty names', async () => {
      const data = [
        { name: 'Imported Checking', type: 'ASSET', startingBalance: 100, currency: 'USD' },
        { name: 'Imported Card', type: 'LIABILITY', startingBalance: 200, currency: 'AUD' },
        { name: ' ', type: 'ASSET', startingBalance: 50, currency: 'AUD' }, // Should be skipped
      ];

      const res = await importAccounts(data);
      expect(res.importedCount).toBe(2);
      expect(res.skippedCount).toBe(1);

      const accounts = await db.account.findMany({ orderBy: { name: 'asc' } });
      expect(accounts).toHaveLength(2);
      expect(accounts[0].name).toBe('Imported Card');
      expect(accounts[0].type).toBe('LIABILITY');
      expect(accounts[0].startingBalance).toBe(200);
      expect(accounts[0].currency).toBe('AUD');

      expect(accounts[1].name).toBe('Imported Checking');
      expect(accounts[1].type).toBe('ASSET');
      expect(accounts[1].startingBalance).toBe(100);
      expect(accounts[1].currency).toBe('USD');
    });

    it('skips duplicate names or duplicate IDs already in the database', async () => {
      // Seed one account with a specific ID and one with a name
      await seedAccount({ name: 'Existing Account' });
      const seeded2 = await seedAccount({ name: 'Unique Account' });

      const data = [
        { name: 'Existing Account', type: 'ASSET', startingBalance: 0 }, // Duplicate name
        { id: seeded2.id, name: 'Brand New Name', type: 'ASSET', startingBalance: 0 }, // Duplicate ID
        { name: 'New Account 1', type: 'ASSET', startingBalance: 50 }, // Should succeed
      ];

      const res = await importAccounts(data);
      expect(res.importedCount).toBe(1);
      expect(res.skippedCount).toBe(2);

      const accounts = await db.account.findMany();
      // Should have the 2 seeded ones and 1 new one
      expect(accounts).toHaveLength(3);
      expect(accounts.map((a) => a.name)).toContain('New Account 1');
    });

    it('skips batch-level duplicates (same name or same ID in the imported list)', async () => {
      const data = [
        { id: '11111111-2222-3333-4444-555555555555', name: 'Batch Unique 1', type: 'ASSET', startingBalance: 0 },
        { id: '22222222-3333-4444-5555-666666666666', name: 'Batch Unique 1', type: 'ASSET', startingBalance: 0 }, // Same name
        { id: '11111111-2222-3333-4444-555555555555', name: 'Batch Unique 2', type: 'ASSET', startingBalance: 0 }, // Same ID
        { id: '33333333-4444-5555-6666-777777777777', name: 'Batch Unique 3', type: 'ASSET', startingBalance: 0 }, // Success
      ];

      const res = await importAccounts(data);
      expect(res.importedCount).toBe(2);
      expect(res.skippedCount).toBe(2);

      const accounts = await db.account.findMany();
      expect(accounts).toHaveLength(2);
      expect(accounts.map((a) => a.name)).toContain('Batch Unique 1');
      expect(accounts.map((a) => a.name)).toContain('Batch Unique 3');
    });

    it('preserves valid UUID IDs and parses fields/defaults correctly', async () => {
      const customId = 'abcdefaf-abcd-abcd-abcd-abcdefabcdef';
      const data = [
        {
          id: customId,
          name: 'Custom Account',
          type: 'ASSET',
          startingBalance: '123.45', // String starting balance should be parsed
          currency: '', // Empty currency should default to AUD
          createdAt: '2026-06-15T12:00:00Z',
        },
      ];

      const res = await importAccounts(data);
      expect(res.importedCount).toBe(1);

      const acc = await db.account.findUnique({ where: { id: customId } });
      expect(acc).not.toBeNull();
      expect(acc?.name).toBe('Custom Account');
      expect(acc?.type).toBe('ASSET');
      expect(acc?.startingBalance).toBe(123.45);
      expect(acc?.currency).toBe('AUD');
      expect(new Date(acc!.createdAt).toISOString()).toBe('2026-06-15T12:00:00.000Z');
    });
  });


  describe('getTransactions with dateRange and isReviewed filters', () => {
    it('filters transactions by review status', async () => {
      const account = await seedAccount();
      const tx1 = await db.transaction.create({
        data: { date: new Date('2026-06-10'), payee: 'Payee 1', amount: -20, accountId: account.id, isReviewed: true }
      });
      const tx2 = await db.transaction.create({
        data: { date: new Date('2026-06-09'), payee: 'Payee 2', amount: -10, accountId: account.id, isReviewed: false }
      });

      const reviewedResult = await getTransactions({ isReviewed: true });
      expect(reviewedResult.transactions).toHaveLength(1);
      expect(reviewedResult.transactions[0].id).toBe(tx1.id);

      const unreviewedResult = await getTransactions({ isReviewed: false });
      expect(unreviewedResult.transactions).toHaveLength(1);
      expect(unreviewedResult.transactions[0].id).toBe(tx2.id);
    });

    it('filters transactions by dateRange (month / ytd)', async () => {
      const account = await seedAccount();
      const now = new Date();
      
      // Seed a transaction in the current month
      const currentMonthTx = await db.transaction.create({
        data: { date: new Date(now.getFullYear(), now.getMonth(), 5), payee: 'Current Month', amount: -5, accountId: account.id }
      });

      // Seed a transaction in the prior year
      const lastYearTx = await db.transaction.create({
        data: { date: new Date(now.getFullYear() - 1, 5, 15), payee: 'Last Year', amount: -15, accountId: account.id }
      });

      const monthResult = await getTransactions({ dateRange: 'month' });
      const monthIds = monthResult.transactions.map(t => t.id);
      expect(monthIds).toContain(currentMonthTx.id);
      expect(monthIds).not.toContain(lastYearTx.id);

      const ytdResult = await getTransactions({ dateRange: 'ytd' });
      const ytdIds = ytdResult.transactions.map(t => t.id);
      expect(ytdIds).toContain(currentMonthTx.id);
      expect(ytdIds).not.toContain(lastYearTx.id);
    });
  });

  describe('bulkUpdateTransactionsCategory', () => {
    it('updates categories and review status for multiple transactions at once', async () => {
      const account = await seedAccount();
      const category = await db.category.create({
        data: { name: 'Food', type: 'EXPENSE', cashFlowType: 'OPERATING' }
      });
      const tx1 = await db.transaction.create({
        data: { date: new Date(), payee: 'Store A', amount: -20, accountId: account.id, isReviewed: false }
      });
      const tx2 = await db.transaction.create({
        data: { date: new Date(), payee: 'Store B', amount: -10, accountId: account.id, isReviewed: false }
      });

      await bulkUpdateTransactionsCategory([tx1.id, tx2.id], category.id);

      const updated1 = await db.transaction.findUnique({ where: { id: tx1.id } });
      const updated2 = await db.transaction.findUnique({ where: { id: tx2.id } });

      expect(updated1?.categoryId).toBe(category.id);
      expect(updated1?.isReviewed).toBe(true);
      expect(updated2?.categoryId).toBe(category.id);
      expect(updated2?.isReviewed).toBe(true);
    });
  });

  describe('bulkDeleteTransactions', () => {
    it('deletes one transaction successfully', async () => {
      const account = await seedAccount();
      const tx = await seedTransaction(account.id);
      const res = await bulkDeleteTransactions([tx.id]);
      expect(res.deletedCount).toBe(1);

      const found = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(found).toBeNull();
    });

    it('deletes multiple transactions successfully', async () => {
      const account = await seedAccount();
      const tx1 = await seedTransaction(account.id, { payee: 'Store A' });
      const tx2 = await seedTransaction(account.id, { payee: 'Store B' });

      const res = await bulkDeleteTransactions([tx1.id, tx2.id]);
      expect(res.deletedCount).toBe(2);

      const found1 = await db.transaction.findUnique({ where: { id: tx1.id } });
      const found2 = await db.transaction.findUnique({ where: { id: tx2.id } });
      expect(found1).toBeNull();
      expect(found2).toBeNull();
    });

    it("returns deletedCount: 0 when IDs don't exist (no error)", async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await bulkDeleteTransactions([fakeId]);
      expect(res.deletedCount).toBe(0);
    });

    it("returns correct count when some IDs exist and some don't", async () => {
      const account = await seedAccount();
      const tx = await seedTransaction(account.id);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await bulkDeleteTransactions([tx.id, fakeId]);
      expect(res.deletedCount).toBe(1);

      const found = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(found).toBeNull();
    });

    it('handles empty array input gracefully', async () => {
      const res = await bulkDeleteTransactions([]);
      expect(res.deletedCount).toBe(0);
    });

    it('handles invalid UUID format gracefully without throwing', async () => {
      const res = await bulkDeleteTransactions(['not-a-uuid', 'another-bad-id']);
      expect(res.deletedCount).toBe(0);
    });
  });

  describe('findDuplicateGroups', () => {
    it('returns duplicate groups from DB correctly', async () => {
      const account = await seedAccount();
      // create two transactions (same date/payee/amount, different description)
      const tx1 = await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Uber', description: 'Ride A', amount: -12.5, accountId: account.id }
      });
      const tx2 = await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Uber', description: 'Ride B', amount: -12.5, accountId: account.id }
      });

      const groups = await findDuplicateGroups({ accountId: account.id });
      expect(groups).toHaveLength(1);
      expect(groups[0].transactions).toHaveLength(2);
      expect(groups[0].transactions.map(t => t.id)).toContain(tx1.id);
      expect(groups[0].transactions.map(t => t.id)).toContain(tx2.id);
    });

    it('scopes by accountId', async () => {
      const account1 = await seedAccount({ name: 'Account 1' });
      const account2 = await seedAccount({ name: 'Account 2' });

      // duplicates in account 1
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Uber', description: 'Ride A', amount: -12.5, accountId: account1.id }
      });
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Uber', description: 'Ride B', amount: -12.5, accountId: account1.id }
      });

      // duplicates in account 2
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Coles', description: 'Shopping A', amount: -50.0, accountId: account2.id }
      });
      await db.transaction.create({
        data: { date: new Date('2026-06-01'), payee: 'Coles', description: 'Shopping B', amount: -50.0, accountId: account2.id }
      });

      const groups1 = await findDuplicateGroups({ accountId: account1.id });
      expect(groups1).toHaveLength(1);
      expect(groups1[0].payee).toBe('Uber');

      const groups2 = await findDuplicateGroups({ accountId: account2.id });
      expect(groups2).toHaveLength(1);
      expect(groups2[0].payee).toBe('Coles');
    });

    it('scopes by dateRange', async () => {
      const account = await seedAccount();
      // duplicate within the current month
      const now = new Date();
      await db.transaction.create({
        data: { date: now, payee: 'Uber', description: 'Ride A', amount: -12.5, accountId: account.id }
      });
      await db.transaction.create({
        data: { date: now, payee: 'Uber', description: 'Ride B', amount: -12.5, accountId: account.id }
      });

      // duplicate from last year
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      await db.transaction.create({
        data: { date: lastYear, payee: 'Coles', description: 'Shopping A', amount: -50.0, accountId: account.id }
      });
      await db.transaction.create({
        data: { date: lastYear, payee: 'Coles', description: 'Shopping B', amount: -50.0, accountId: account.id }
      });

      const groupsMonth = await findDuplicateGroups({ accountId: account.id, dateRange: 'month' });
      expect(groupsMonth).toHaveLength(1);
      expect(groupsMonth[0].payee).toBe('Uber');
    });
  });
});


