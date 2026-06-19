import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getTestDb, clearTestDb } from '@/lib/test-db';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock the db module to export our test client instance.
vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

import { registerTransactionTools } from './transactions';
import { registerCategoryTools } from './categories';
import { registerAccountTools } from './accounts';
import { registerReportTools } from './reports';
import { registerAnalysisTools } from './analysis';

const db = getTestDb();

describe('MCP Tools Integration Tests', () => {
  const tools = new Map<string, { schema: any; handler: Function }>();
  const mockServer = {
    tool: (name: string, description: string, schema: any, handler: Function) => {
      tools.set(name, { schema, handler });
    }
  } as unknown as McpServer;

  // Register all tools
  registerTransactionTools(mockServer);
  registerCategoryTools(mockServer);
  registerAccountTools(mockServer);
  registerReportTools(mockServer);
  registerAnalysisTools(mockServer);

  beforeEach(async () => {
    await clearTestDb();
  });

  // Helper seed functions
  async function seedAccount(overrides: Partial<{ name: string; type: 'ASSET' | 'LIABILITY'; startingBalance: number; currency: string }> = {}) {
    return db.account.create({
      data: {
        name: overrides.name ?? 'Checking Account',
        type: overrides.type ?? 'ASSET',
        startingBalance: overrides.startingBalance ?? 1000,
        currency: overrides.currency ?? 'AUD',
      },
    });
  }

  async function seedCategory(overrides: Partial<{ name: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; cashFlowType: 'OPERATING' | 'INVESTING' | 'FINANCING' }> = {}) {
    return db.category.create({
      data: {
        name: overrides.name ?? 'Food',
        type: overrides.type ?? 'EXPENSE',
        cashFlowType: overrides.cashFlowType ?? 'OPERATING',
      },
    });
  }

  async function seedTransaction(accountId: string, overrides: Partial<{ payee: string; amount: number; description: string | null; categoryId: string | null; date: Date }> = {}) {
    return db.transaction.create({
      data: {
        date: overrides.date ?? new Date('2026-06-01'),
        payee: overrides.payee ?? 'Supermarket',
        amount: overrides.amount ?? -50,
        accountId,
        categoryId: overrides.categoryId ?? null,
        description: overrides.description ?? null,
        isReviewed: overrides.categoryId !== null,
      },
    });
  }

  function getHandler(name: string): Function {
    const entry = tools.get(name);
    if (!entry) throw new Error(`Tool "${name}" not registered`);
    return entry.handler;
  }

  // Test accounts tools
  describe('Account Tools', () => {
    it('list_accounts: returns empty array when no accounts exist', async () => {
      const handler = getHandler('list_accounts');
      const result = await handler({ includeBalances: false });
      const data = JSON.parse(result.content[0].text);
      expect(data.accounts).toEqual([]);
    });

    it('list_accounts: list all accounts', async () => {
      await seedAccount({ name: 'Savings', currency: 'USD' });
      await seedAccount({ name: 'Checking', currency: 'AUD' });

      const handler = getHandler('list_accounts');
      const result = await handler({ includeBalances: false });
      const data = JSON.parse(result.content[0].text);
      expect(data.accounts).toHaveLength(2);
      expect(data.accounts[0].name).toBe('Checking');
      expect(data.accounts[1].name).toBe('Savings');
    });

    it('list_accounts: filter by currency', async () => {
      await seedAccount({ name: 'Savings', currency: 'USD' });
      await seedAccount({ name: 'Checking', currency: 'AUD' });

      const handler = getHandler('list_accounts');
      const result = await handler({ includeBalances: false, currency: 'USD' });
      const data = JSON.parse(result.content[0].text);
      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0].name).toBe('Savings');
    });

    it('list_accounts: include balances', async () => {
      const acc = await seedAccount({ startingBalance: 200, currency: 'AUD' });
      await seedTransaction(acc.id, { amount: -50 });

      const handler = getHandler('list_accounts');
      const result = await handler({ includeBalances: true });
      const data = JSON.parse(result.content[0].text);
      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0].balance).toBe(150);
      expect(data.totals.AUD.netWorth).toBe(150);
    });

    it('create_account: creates an account successfully', async () => {
      const handler = getHandler('create_account');
      const result = await handler({
        name: 'Savings Account',
        type: 'ASSET',
        startingBalance: 5000,
        currency: 'USD',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.account.name).toBe('Savings Account');
      expect(data.account.type).toBe('ASSET');
      expect(data.account.startingBalance).toBe(5000);
      expect(data.account.currency).toBe('USD');

      const dbAccount = await db.account.findUnique({ where: { id: data.account.id } });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount?.name).toBe('Savings Account');
    });

    it('create_account: rejects invalid currency', async () => {
      const handler = getHandler('create_account');
      const result = await handler({
        name: 'Bad Currency',
        type: 'ASSET',
        currency: 'INVALID',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid currency code');
    });

    it('create_account: rejects unsupported 3-letter currency code', async () => {
      const handler = getHandler('create_account');
      const result = await handler({
        name: 'Bad Currency',
        type: 'ASSET',
        currency: 'ZZZ',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not supported');
    });

    it('create_account: rejects empty name', async () => {
      const handler = getHandler('create_account');
      const result = await handler({
        name: '   ',
        type: 'ASSET',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Account name is required');
    });

    it('create_account: uses defaults for balance and currency', async () => {
      const handler = getHandler('create_account');
      const result = await handler({
        name: 'Default Account',
        type: 'LIABILITY',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.account.startingBalance).toBe(0);
      expect(data.account.currency).toBe('AUD');
      expect(data.account.type).toBe('LIABILITY');
    });

    it('create_account: rejects duplicate account name', async () => {
      const handler = getHandler('create_account');
      // Create first
      const first = await handler({ name: 'Duplicate Test', type: 'ASSET' });
      expect(first.isError).toBeFalsy();

      // Attempt duplicate
      const second = await handler({ name: 'Duplicate Test', type: 'LIABILITY' });
      expect(second.isError).toBe(true);
      expect(second.content[0].text).toContain('already exists');
    });
  });

  // Test category tools
  describe('Category Tools', () => {
    it('list_categories: list categories', async () => {
      await seedCategory({ name: 'Salary', type: 'INCOME' });
      await seedCategory({ name: 'Rent', type: 'EXPENSE' });

      const handler = getHandler('list_categories');
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);
      expect(data.categories).toHaveLength(2);
    });

    it('create_category: creates a category successfully', async () => {
      const handler = getHandler('create_category');
      const result = await handler({
        name: 'Dining Out',
        type: 'EXPENSE',
        cashFlowType: 'OPERATING',
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.category.name).toBe('Dining Out');

      const dbCat = await db.category.findUnique({ where: { name: 'Dining Out' } });
      expect(dbCat).not.toBeNull();
      expect(dbCat?.type).toBe('EXPENSE');
    });

    it('create_category_rule: creates rule and matches retroactively', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory({ name: 'Food' });
      const tx = await seedTransaction(acc.id, { payee: 'Woolworths Metro', categoryId: null });

      const handler = getHandler('create_category_rule');
      const result = await handler({ pattern: 'woolworths', categoryId: cat.id });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.rule.pattern).toBe('woolworths');

      const updatedTx = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(updatedTx?.categoryId).toBe(cat.id);
    });

    it('create_category_rule: preserves original casing of pattern', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory({ name: 'Transport' });
      await seedTransaction(acc.id, { payee: 'Netflix Subscription', categoryId: null });

      const handler = getHandler('create_category_rule');
      const result = await handler({ pattern: 'NetFlix', categoryId: cat.id });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      // Original casing is preserved, not lowercased
      expect(data.rule.pattern).toBe('NetFlix');

      // Matching is still case-insensitive
      const rule = await db.categoryRule.findFirst({ where: { categoryId: cat.id } });
      expect(rule?.pattern).toBe('NetFlix');
    });
  });

  // Test transactions tools
  describe('Transaction Tools', () => {
    it('import_csv: parses and imports CSV', async () => {
      const acc = await seedAccount();
      const csvContent = `Date,Payee,Amount\n01/06/2026,Netflix,-15.99\n02/06/2026,Salary,2500.00`;
      
      const handler = getHandler('import_csv');
      const result = await handler({
        csvContent,
        accountId: acc.id,
        columnMapping: { date: 'Date', payee: 'Payee', amount: 'Amount' },
        dateFormat: 'DD/MM/YYYY',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.importedCount).toBe(2);

      const txs = await db.transaction.findMany({ where: { accountId: acc.id }, orderBy: { date: 'asc' } });
      expect(txs).toHaveLength(2);
    });

    it('import_csv: parses headerless CSV with column indices', async () => {
      const acc = await seedAccount();
      const csvContent = `01/06/2026,Netflix,-15.99\n02/06/2026,Salary,2500.00`;
      
      const handler = getHandler('import_csv');
      const result = await handler({
        csvContent,
        accountId: acc.id,
        columnMapping: { date: '0', payee: '1', amount: '2' },
        dateFormat: 'DD/MM/YYYY',
        hasHeaders: false,
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.importedCount).toBe(2);

      const txs = await db.transaction.findMany({ where: { accountId: acc.id }, orderBy: { date: 'asc' } });
      expect(txs).toHaveLength(2);
      expect(txs[0].payee).toBe('Netflix');
      expect(txs[1].payee).toBe('Salary');
    });

    it('import_csv: parses headerless CSV with debit/credit columns', async () => {
      const acc = await seedAccount();
      const csvContent = `01/06/2026,Uber,15.50,\n02/06/2026,Salary,,2500.00`;
      
      const handler = getHandler('import_csv');
      const result = await handler({
        csvContent,
        accountId: acc.id,
        columnMapping: { date: '0', payee: '1', debit: '2', credit: '3' },
        dateFormat: 'DD/MM/YYYY',
        hasHeaders: false,
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.importedCount).toBe(2);

      const txs = await db.transaction.findMany({ where: { accountId: acc.id }, orderBy: { date: 'asc' } });
      expect(txs).toHaveLength(2);
      expect(txs[0].payee).toBe('Uber');
      expect(txs[0].amount).toBe(-15.5);
      expect(txs[1].payee).toBe('Salary');
      expect(txs[1].amount).toBe(2500);
    });

    it('list_transactions: query with filters', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory();
      await seedTransaction(acc.id, { payee: 'Target Spend', categoryId: cat.id });
      await seedTransaction(acc.id, { payee: 'Other Spend', categoryId: null });

      const handler = getHandler('list_transactions');
      const result = await handler({ categoryId: 'uncategorized' });
      if (result.isError) {
        console.error('list_transactions error:', result.content[0].text);
      }
      const data = JSON.parse(result.content[0].text);
      expect(data.transactions).toHaveLength(1);
      expect(data.transactions[0].payee).toBe('Other Spend');
    });

    it('update_transaction_category: update multiple transactions', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory();
      const tx1 = await seedTransaction(acc.id);
      const tx2 = await seedTransaction(acc.id, { payee: 'Another Store', amount: -25 });

      const handler = getHandler('update_transaction_category');
      const result = await handler({
        transactionIds: [tx1.id, tx2.id],
        categoryId: cat.id,
        createRule: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.updated).toBe(2);
      expect(data.ruleCreated).toBe(true);

      const rule = await db.categoryRule.findFirst({ where: { categoryId: cat.id } });
      // Pattern preserves original casing (seeded as 'Supermarket')
      expect(rule?.pattern).toBe('Supermarket');
    });

    it('categorize_uncategorized: batch update by pattern', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory();
      const tx = await seedTransaction(acc.id, { payee: 'Uber Ride 1234', categoryId: null });

      const handler = getHandler('categorize_uncategorized');
      const result = await handler({
        pattern: 'Uber',
        categoryId: cat.id,
        createRule: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.updatedCount).toBe(1);
      expect(data.ruleCreated).toBe(true);

      const updated = await db.transaction.findUnique({ where: { id: tx.id } });
      expect(updated?.categoryId).toBe(cat.id);

      // Pattern preserves original casing
      const rule = await db.categoryRule.findFirst({ where: { categoryId: cat.id } });
      expect(rule?.pattern).toBe('Uber');
    });

    it('delete_transactions: deletes transactions successfully', async () => {
      const acc = await seedAccount();
      const tx1 = await seedTransaction(acc.id, { payee: 'Delete Me 1' });
      const tx2 = await seedTransaction(acc.id, { payee: 'Delete Me 2' });
      const tx3 = await seedTransaction(acc.id, { payee: 'Keep Me' });

      const handler = getHandler('delete_transactions');
      const result = await handler({ transactionIds: [tx1.id, tx2.id] });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);

      const remaining = await db.transaction.findMany({ where: { accountId: acc.id } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(tx3.id);
    });
  });

  // Test report tools
  describe('Report Tools', () => {
    it('get_dashboard_summary: calculates runway and net income', async () => {
      const acc = await seedAccount({ startingBalance: 10000 });
      const catIncome = await seedCategory({ name: 'Salary', type: 'INCOME' });
      const catExpense = await seedCategory({ name: 'Rent', type: 'EXPENSE' });

      // Current month transactions
      const now = new Date();
      await seedTransaction(acc.id, { amount: 3000, categoryId: catIncome.id, date: new Date(now.getFullYear(), now.getMonth(), 10) });
      await seedTransaction(acc.id, { amount: -1000, categoryId: catExpense.id, date: new Date(now.getFullYear(), now.getMonth(), 15) });

      const handler = getHandler('get_dashboard_summary');
      const result = await handler({ currency: 'AUD' });
      const data = JSON.parse(result.content[0].text);

      expect(data.netWorth.current).toBe(12000);
      expect(data.netIncome.current).toBe(2000);
    });

    it('get_financial_reports: computes reports with comparative prior period', async () => {
      const acc = await seedAccount({ startingBalance: 5000 });
      const cat = await seedCategory({ name: 'Consulting', type: 'INCOME' });
      
      // Current period: 2026-06-01 to 2026-06-30
      await seedTransaction(acc.id, { amount: 2000, categoryId: cat.id, date: new Date('2026-06-15') });
      // Prior period: 2026-05-01 to 2026-05-31
      await seedTransaction(acc.id, { amount: 1500, categoryId: cat.id, date: new Date('2026-05-15') });

      const handler = getHandler('get_financial_reports');
      const result = await handler({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        currency: 'AUD',
        includePriorPeriod: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.incomeStatement.totals.AUD.netIncome).toBe(2000);
      expect(data.priorPeriod.incomeStatement.totals.AUD.netIncome).toBe(1500);
    });

    it('get_net_worth_trend: computes lookup trend points', async () => {
      const acc = await seedAccount({ startingBalance: 1000 });
      const handler = getHandler('get_net_worth_trend');
      const result = await handler({ months: 3 });
      if (result.isError) {
        console.error('get_net_worth_trend error:', result.content[0].text);
      }
      const data = JSON.parse(result.content[0].text);

      expect(data.dataPoints).toHaveLength(3);
    });

    it('get_income_expense_breakdown: computes spendings distribution', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory({ name: 'Dining', type: 'EXPENSE' });
      await seedTransaction(acc.id, { amount: -50, categoryId: cat.id });

      const handler = getHandler('get_income_expense_breakdown');
      const result = await handler({
        startDate: '2026-05-01',
        endDate: '2026-07-01',
        type: 'EXPENSE',
        currency: 'AUD',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBe(50);
      expect(data.categories[0].name).toBe('Dining');
    });
  });

  // Test analysis tools
  describe('Analysis Tools', () => {
    it('detect_duplicates: identifies duplicate transactions and respects maxResults', async () => {
      const acc = await seedAccount();
      // Three identical amount and payee transactions close in date -> 3 duplicate pairs
      await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-01') });
      await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-02') });
      await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-03') });

      const handler = getHandler('detect_duplicates');
      
      // Without limit
      const resultAll = await handler({ accountId: acc.id });
      const dataAll = JSON.parse(resultAll.content[0].text);
      expect(dataAll.duplicates.length).toBeGreaterThan(1);

      // With limit
      const resultLimited = await handler({ accountId: acc.id, maxResults: 1 });
      const dataLimited = JSON.parse(resultLimited.content[0].text);
      expect(dataLimited.duplicates).toHaveLength(1);
      expect(dataLimited.duplicates[0].matchScore).toBe(1.0);
    });

    it('identify_recurring_transactions: identifies subscriptions', async () => {
      const acc = await seedAccount();
      const cat = await seedCategory({ name: 'Subscriptions' });

      // Seed three monthly transactions
      await seedTransaction(acc.id, { payee: 'Netflix Inc', amount: -15.99, categoryId: cat.id, date: new Date('2026-04-01') });
      await seedTransaction(acc.id, { payee: 'Netflix Inc', amount: -15.99, categoryId: cat.id, date: new Date('2026-05-01') });
      await seedTransaction(acc.id, { payee: 'Netflix Inc', amount: -15.99, categoryId: cat.id, date: new Date('2026-06-01') });

      const handler = getHandler('identify_recurring_transactions');
      const result = await handler({ months: 6 });
      const data = JSON.parse(result.content[0].text);

      expect(data.recurring).toHaveLength(1);
      expect(data.recurring[0].frequency).toBe('monthly');
      expect(data.recurring[0].merchantPattern).toBe('netflix');
    });

    it('detect_duplicates: in mode="import" detects duplicate groups correctly', async () => {
      const acc = await seedAccount();
      // Three identical amount, payee, and date transactions -> duplicates in import mode
      const t1 = await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-01') });
      const t2 = await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-01') });
      const t3 = await seedTransaction(acc.id, { payee: 'Netflix', amount: -15.99, date: new Date('2026-06-01') });

      const handler = getHandler('detect_duplicates');
      const result = await handler({ accountId: acc.id, mode: 'import' });
      const data = JSON.parse(result.content[0].text);

      // t2 and t3 should be paired with t1 (lexicographically first ID is the original because seedTransaction creates them sequentially)
      expect(data.duplicates.length).toBe(2);
      expect(data.duplicates[0].matchScore).toBe(1.0);
    });
  });
});
