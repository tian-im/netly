import { AccountLike } from '@/lib/reports';

export interface BalanceSheetTotal {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface BalanceSheetAccount extends AccountLike {
  balance: number;
}

export interface BalanceSheet {
  accounts: BalanceSheetAccount[];
  totals: Record<string, BalanceSheetTotal>;
}

export interface CategoryTotal {
  name: string;
  amount: number;
}

export interface IncomeStatementTotal {
  income: CategoryTotal[];
  expenses: CategoryTotal[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface IncomeStatement {
  totals: Record<string, IncomeStatementTotal>;
}

export interface CashFlowSection {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowStatementTotal {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netCashFlow: number;
}

export interface CashFlowStatement {
  totals: Record<string, CashFlowStatementTotal>;
}

export interface FinancialReports {
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  cashFlowStatement: CashFlowStatement;
}
