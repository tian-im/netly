import { describe, it, expect } from 'vitest';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from './reports';

interface AccountMock {
  id: string;
  name: string;
  type: string; // "ASSET" | "LIABILITY"
  startingBalance: number;
  currency: string;
}

interface CategoryMock {
  id: string;
  name: string;
  type: string; // "INCOME" | "EXPENSE" | "TRANSFER"
  cashFlowType: string; // "OPERATING" | "INVESTING" | "FINANCING"
}

interface TransactionMock {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  categoryId: string | null;
  category: CategoryMock | null;
  currency?: string;
}

describe('Financial Reporting Calculations Engine (Multi-Currency)', () => {
  const accounts: AccountMock[] = [
    { id: 'acc_checking', name: 'Checking Account', type: 'ASSET', startingBalance: 2000, currency: 'AUD' },
    { id: 'acc_savings', name: 'Savings Account', type: 'ASSET', startingBalance: 5000, currency: 'USD' },
    { id: 'acc_credit', name: 'Credit Card', type: 'LIABILITY', startingBalance: -500, currency: 'AUD' }, // owe 500 AUD
  ];

  const categories: Record<string, CategoryMock> = {
    cat_salary: { id: 'cat_salary', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' },
    cat_groceries: { id: 'cat_groceries', name: 'Groceries', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    cat_rent: { id: 'cat_rent', name: 'Rent', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    cat_invest: { id: 'cat_invest', name: 'Stock Purchase', type: 'EXPENSE', cashFlowType: 'INVESTING' },
    cat_loan: { id: 'cat_loan', name: 'Loan Repayment', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    cat_transfer: { id: 'cat_transfer', name: 'Transfer', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  };

  const transactions: TransactionMock[] = [
    {
      id: 'tx_1',
      date: new Date('2026-06-01'),
      amount: 3000,
      accountId: 'acc_checking',
      categoryId: 'cat_salary',
      category: categories.cat_salary,
      currency: 'AUD',
    },
    {
      id: 'tx_2',
      date: new Date('2026-06-02'),
      amount: -150,
      accountId: 'acc_checking',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
      currency: 'AUD',
    },
    {
      id: 'tx_3',
      date: new Date('2026-06-05'),
      amount: -1000,
      accountId: 'acc_checking',
      categoryId: 'cat_rent',
      category: categories.cat_rent,
      currency: 'AUD',
    },
    {
      id: 'tx_4',
      date: new Date('2026-06-10'),
      amount: -300,
      accountId: 'acc_credit',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
      currency: 'AUD',
    },
    {
      id: 'tx_5',
      date: new Date('2026-06-15'),
      amount: -200,
      accountId: 'acc_checking',
      categoryId: 'cat_transfer',
      category: categories.cat_transfer,
      currency: 'AUD',
    },
    {
      id: 'tx_6',
      date: new Date('2026-06-15'),
      amount: 200,
      accountId: 'acc_credit',
      categoryId: 'cat_transfer',
      category: categories.cat_transfer,
      currency: 'AUD',
    },
    {
      id: 'tx_7',
      date: new Date('2026-06-20'),
      amount: -800,
      accountId: 'acc_checking',
      categoryId: 'cat_invest',
      category: categories.cat_invest,
      currency: 'AUD',
    },
    {
      id: 'tx_8',
      date: new Date('2026-06-25'),
      amount: -400,
      accountId: 'acc_checking',
      categoryId: 'cat_loan',
      category: categories.cat_loan,
      currency: 'AUD',
    },
    {
      id: 'tx_9',
      date: new Date('2026-07-01'),
      amount: -100,
      accountId: 'acc_checking',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
      currency: 'AUD',
    },
    // USD transactions
    {
      id: 'tx_usd_1',
      date: new Date('2026-06-18'),
      amount: -50,
      accountId: 'acc_savings',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
      currency: 'USD',
    },
  ];

  describe('generateBalanceSheet', () => {
    it('should compute balances up to a specified end date grouped by currency', () => {
      const endDate = new Date('2026-06-30');
      const sheet = generateBalanceSheet(accounts, transactions, endDate);
      
      const checkAcc = sheet.accounts.find((a) => a.id === 'acc_checking');
      expect(checkAcc?.balance).toBe(2450);

      const savingsAcc = sheet.accounts.find((a) => a.id === 'acc_savings');
      expect(savingsAcc?.balance).toBe(4950);

      const cardAcc = sheet.accounts.find((a) => a.id === 'acc_credit');
      expect(cardAcc?.balance).toBe(-600);

      // AUD totals
      expect(sheet.totals.AUD).toBeDefined();
      expect(sheet.totals.AUD.totalAssets).toBe(2450);
      expect(sheet.totals.AUD.totalLiabilities).toBe(600);
      expect(sheet.totals.AUD.netWorth).toBe(1850);

      // USD totals
      expect(sheet.totals.USD).toBeDefined();
      expect(sheet.totals.USD.totalAssets).toBe(4950);
      expect(sheet.totals.USD.totalLiabilities).toBe(0);
      expect(sheet.totals.USD.netWorth).toBe(4950);
    });

    it('should ignore transactions past the end date', () => {
      const endDate = new Date('2026-06-10');
      const sheet = generateBalanceSheet(accounts, transactions, endDate);
      
      const checkAcc = sheet.accounts.find((a) => a.id === 'acc_checking');
      expect(checkAcc?.balance).toBe(3850);

      const savingsAcc = sheet.accounts.find((a) => a.id === 'acc_savings');
      expect(savingsAcc?.balance).toBe(5000); // no USD transaction before or at 2026-06-10
      
      // AUD totals
      expect(sheet.totals.AUD.totalAssets).toBe(3850);
      expect(sheet.totals.AUD.totalLiabilities).toBe(800);
      expect(sheet.totals.AUD.netWorth).toBe(3050);

      // USD totals
      expect(sheet.totals.USD.totalAssets).toBe(5000);
      expect(sheet.totals.USD.totalLiabilities).toBe(0);
      expect(sheet.totals.USD.netWorth).toBe(5000);
    });
  });

  describe('generateIncomeStatement', () => {
    it('should compute income and expense grouped by category and currency in a date range', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateIncomeStatement(transactions, startDate, endDate);

      // AUD
      expect(statement.totals.AUD).toBeDefined();
      expect(statement.totals.AUD.totalIncome).toBe(3000);
      expect(statement.totals.AUD.totalExpenses).toBe(2650);
      expect(statement.totals.AUD.netIncome).toBe(350);

      const audSalaryGroup = statement.totals.AUD.income.find((c: any) => c.name === 'Salary');
      expect(audSalaryGroup?.amount).toBe(3000);

      const audRentGroup = statement.totals.AUD.expenses.find((c: any) => c.name === 'Rent');
      expect(audRentGroup?.amount).toBe(1000);

      // USD
      expect(statement.totals.USD).toBeDefined();
      expect(statement.totals.USD.totalIncome).toBe(0);
      expect(statement.totals.USD.totalExpenses).toBe(50);
      expect(statement.totals.USD.netIncome).toBe(-50);

      const usdGroceriesGroup = statement.totals.USD.expenses.find((c: any) => c.name === 'Groceries');
      expect(usdGroceriesGroup?.amount).toBe(50);
    });
  });

  describe('generateCashFlowStatement', () => {
    it('should compute cash flows grouped by cashFlowType and currency (Direct Method)', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateCashFlowStatement(transactions, startDate, endDate);

      // AUD
      expect(statement.totals.AUD).toBeDefined();
      expect(statement.totals.AUD.operating.net).toBe(1550);
      expect(statement.totals.AUD.investing.net).toBe(-800);
      expect(statement.totals.AUD.financing.net).toBe(-400);
      expect(statement.totals.AUD.netCashFlow).toBe(350);

      // USD
      expect(statement.totals.USD).toBeDefined();
      expect(statement.totals.USD.operating.net).toBe(-50);
      expect(statement.totals.USD.investing.net).toBe(0);
      expect(statement.totals.USD.financing.net).toBe(0);
      expect(statement.totals.USD.netCashFlow).toBe(-50);
    });

    it('should skip categories with unknown cashFlowType section groupings', () => {
      const unknownCFCategory: CategoryMock = {
        id: 'cat_unknown',
        name: 'Unknown Section',
        type: 'EXPENSE',
        cashFlowType: 'OTHER_CF_SECTION',
      };

      const customTxList: TransactionMock[] = [
        {
          id: 'tx_unknown',
          date: new Date('2026-06-05'),
          amount: -50,
          accountId: 'acc_checking',
          categoryId: 'cat_unknown',
          category: unknownCFCategory,
          currency: 'AUD',
        },
      ];

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateCashFlowStatement(customTxList, startDate, endDate);
      expect(statement.totals.AUD.operating.net).toBe(0);
      expect(statement.totals.AUD.investing.net).toBe(0);
      expect(statement.totals.AUD.financing.net).toBe(0);
      expect(statement.totals.AUD.netCashFlow).toBe(0);
    });
  });

  describe('defaulting missing currency to AUD', () => {
    it('should default missing currency fields to AUD in calculations', () => {
      const legacyAccounts = [
        { id: 'acc_legacy', name: 'Legacy Account', type: 'ASSET', startingBalance: 1000 },
      ];
      const legacyTransactions = [
        {
          id: 'tx_legacy',
          date: new Date('2026-06-05'),
          amount: 200,
          accountId: 'acc_legacy',
          categoryId: 'cat_salary',
          category: categories.cat_salary,
        }
      ];

      const sheet = generateBalanceSheet(legacyAccounts as any, legacyTransactions as any, new Date('2026-06-10'));
      expect(sheet.totals.AUD).toBeDefined();
      expect(sheet.totals.AUD.netWorth).toBe(1200);

      const statement = generateIncomeStatement(legacyTransactions as any, new Date('2026-06-01'), new Date('2026-06-30'));
      expect(statement.totals.AUD).toBeDefined();
      expect(statement.totals.AUD.totalIncome).toBe(200);

      const cashFlow = generateCashFlowStatement(legacyTransactions as any, new Date('2026-06-01'), new Date('2026-06-30'));
      expect(cashFlow.totals.AUD).toBeDefined();
      expect(cashFlow.totals.AUD.operating.net).toBe(200);
    });
  });
});
