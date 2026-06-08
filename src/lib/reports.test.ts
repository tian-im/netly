import { describe, it, expect } from 'vitest';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from './reports';

interface AccountMock {
  id: string;
  name: string;
  type: string; // "ASSET" | "LIABILITY"
  startingBalance: number;
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
}

describe('Financial Reporting Calculations Engine', () => {
  const accounts: AccountMock[] = [
    { id: 'acc_checking', name: 'Checking Account', type: 'ASSET', startingBalance: 2000 },
    { id: 'acc_savings', name: 'Savings Account', type: 'ASSET', startingBalance: 5000 },
    { id: 'acc_credit', name: 'Credit Card', type: 'LIABILITY', startingBalance: -500 }, // owe 500
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
    },
    {
      id: 'tx_2',
      date: new Date('2026-06-02'),
      amount: -150,
      accountId: 'acc_checking',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
    },
    {
      id: 'tx_3',
      date: new Date('2026-06-05'),
      amount: -1000,
      accountId: 'acc_checking',
      categoryId: 'cat_rent',
      category: categories.cat_rent,
    },
    {
      id: 'tx_4',
      date: new Date('2026-06-10'),
      amount: -300,
      accountId: 'acc_credit',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
    },
    {
      id: 'tx_5',
      date: new Date('2026-06-15'),
      amount: -200,
      accountId: 'acc_checking',
      categoryId: 'cat_transfer',
      category: categories.cat_transfer,
    },
    {
      id: 'tx_6',
      date: new Date('2026-06-15'),
      amount: 200,
      accountId: 'acc_credit',
      categoryId: 'cat_transfer',
      category: categories.cat_transfer,
    },
    {
      id: 'tx_7',
      date: new Date('2026-06-20'),
      amount: -800,
      accountId: 'acc_checking',
      categoryId: 'cat_invest',
      category: categories.cat_invest,
    },
    {
      id: 'tx_8',
      date: new Date('2026-06-25'),
      amount: -400,
      accountId: 'acc_checking',
      categoryId: 'cat_loan',
      category: categories.cat_loan,
    },
    {
      id: 'tx_9',
      date: new Date('2026-07-01'),
      amount: -100,
      accountId: 'acc_checking',
      categoryId: 'cat_groceries',
      category: categories.cat_groceries,
    },
  ];

  describe('generateBalanceSheet', () => {
    it('should compute balances up to a specified end date', () => {
      const endDate = new Date('2026-06-30');
      const sheet = generateBalanceSheet(accounts, transactions, endDate);
      
      const checkAcc = sheet.accounts.find((a) => a.id === 'acc_checking');
      expect(checkAcc?.balance).toBe(2450);

      const cardAcc = sheet.accounts.find((a) => a.id === 'acc_credit');
      expect(cardAcc?.balance).toBe(-600);

      expect(sheet.totalAssets).toBe(7450);
      expect(sheet.totalLiabilities).toBe(600);
      expect(sheet.netWorth).toBe(6850);
    });

    it('should ignore transactions past the end date', () => {
      const endDate = new Date('2026-06-10');
      const sheet = generateBalanceSheet(accounts, transactions, endDate);
      
      const checkAcc = sheet.accounts.find((a) => a.id === 'acc_checking');
      expect(checkAcc?.balance).toBe(3850);

      const cardAcc = sheet.accounts.find((a) => a.id === 'acc_credit');
      expect(cardAcc?.balance).toBe(-800);
      
      expect(sheet.totalAssets).toBe(8850);
      expect(sheet.totalLiabilities).toBe(800);
      expect(sheet.netWorth).toBe(8050);
    });
  });

  describe('generateIncomeStatement', () => {
    it('should compute income and expense grouped by category in a date range', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateIncomeStatement(transactions, startDate, endDate);

      expect(statement.totalIncome).toBe(3000);
      
      const salaryGroup = statement.income.find((c) => c.name === 'Salary');
      expect(salaryGroup?.amount).toBe(3000);

      const groceriesGroup = statement.expenses.find((c) => c.name === 'Groceries');
      expect(groceriesGroup?.amount).toBe(450);

      const rentGroup = statement.expenses.find((c) => c.name === 'Rent');
      expect(rentGroup?.amount).toBe(1000);

      expect(statement.totalExpenses).toBe(2650);
      expect(statement.netIncome).toBe(350);
    });
  });

  describe('generateCashFlowStatement', () => {
    it('should compute cash flows grouped by cashFlowType (Direct Method)', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateCashFlowStatement(transactions, startDate, endDate);

      expect(statement.operating.net).toBe(1550);
      expect(statement.investing.net).toBe(-800);
      expect(statement.financing.net).toBe(-400);
      expect(statement.netCashFlow).toBe(350);
    });

    it('should skip categories with unknown cashFlowType section groupings', () => {
      const unknownCFCategory: CategoryMock = {
        id: 'cat_unknown',
        name: 'Unknown Section',
        type: 'EXPENSE',
        cashFlowType: 'OTHER_CF_SECTION', // does not match OPERATING / INVESTING / FINANCING sections
      };

      const customTxList: TransactionMock[] = [
        {
          id: 'tx_unknown',
          date: new Date('2026-06-05'),
          amount: -50,
          accountId: 'acc_checking',
          categoryId: 'cat_unknown',
          category: unknownCFCategory,
        },
      ];

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const statement = generateCashFlowStatement(customTxList, startDate, endDate);
      expect(statement.operating.net).toBe(0);
      expect(statement.investing.net).toBe(0);
      expect(statement.financing.net).toBe(0);
      expect(statement.netCashFlow).toBe(0);
    });
  });
});
