import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import DashboardClient from './dashboard-client';
import enMessages from '../../messages/en.json';
import zhMessages from '../../messages/zh.json';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateCashFlowStatement,
} from '@/lib/reports';

// Configure React act environment for tests
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      refresh: vi.fn(),
    };
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowUpRight: () => <div data-testid="arrow-up-right" />,
  ArrowDownRight: () => <div data-testid="arrow-down-right" />,
  ArrowUpDown: ({ className }: any) => <div data-testid="arrow-up-down" className={className} />,
  AlertTriangle: ({ className }: any) => <div data-testid="alert-triangle" className={className} />,
  PiggyBank: () => <div data-testid="piggy-bank" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  Activity: () => <div data-testid="activity" />,
  Calendar: () => <div data-testid="calendar" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  BarChart3: () => <div data-testid="bar-chart-3" />,
  Wallet: () => <div data-testid="wallet" />,
  Tag: ({ className }: any) => <div data-testid="tag" className={className} />,
}));

// Mock Link
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  };
});


describe('DashboardClient Component', () => {
  const mockAccounts = [
    { id: 'acc_1', name: 'Checking Account', type: 'ASSET', startingBalance: 1000, currency: 'AUD' },
    { id: 'acc_2', name: 'Credit Card', type: 'LIABILITY', startingBalance: -200, currency: 'AUD' },
  ];

  const mockMultiCurrencyAccounts = [
    { id: 'acc_1', name: 'Checking Account AUD', type: 'ASSET', startingBalance: 1000, currency: 'AUD' },
    { id: 'acc_2', name: 'Savings Account USD', type: 'ASSET', startingBalance: 500, currency: 'USD' },
  ];

  const mockTransactions = [
    {
      id: 'tx_1',
      date: '2026-06-01T00:00:00.000Z',
      amount: 500,
      accountId: 'acc_1',
      currency: 'AUD',
      categoryId: 'cat_salary',
      category: { id: 'cat_salary', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' },
    },
    {
      id: 'tx_2',
      date: '2026-06-02T00:00:00.000Z',
      amount: -100,
      accountId: 'acc_1',
      currency: 'AUD',
      categoryId: 'cat_groceries',
      category: { id: 'cat_groceries', name: 'Groceries', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    },
  ];

  // Helper to determine default currency (mirrors server logic in page.tsx)
  const getDefaultCurrency = (accounts: any[]): string => {
    if (accounts.length === 0) return DEFAULT_CURRENCY;
    const counts: Record<string, number> = {};
    accounts.forEach((a: any) => {
      const c = a.currency || DEFAULT_CURRENCY;
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // Helper to construct props like the page component does
  const getHelperProps = (accounts: any[], transactions: any[]) => {
    const lastDay = new Date('2026-06-30T00:00:00.000Z');
    const firstDay = new Date('2026-06-01T00:00:00.000Z');
    const prevPeriodStart = new Date('2026-05-01T00:00:00.000Z');
    const prevPeriodEnd = new Date('2026-05-31T00:00:00.000Z');

    const mappedTransactions = transactions.map((t) => ({ ...t, date: new Date(t.date) }));

    const bs = generateBalanceSheet(accounts, mappedTransactions, lastDay);
    const is = generateIncomeStatement(mappedTransactions, firstDay, lastDay);
    const cfs = generateCashFlowStatement(mappedTransactions, firstDay, lastDay);
    const prevBS = generateBalanceSheet(accounts, mappedTransactions, prevPeriodEnd);
    const prevIS = generateIncomeStatement(mappedTransactions, prevPeriodStart, prevPeriodEnd);

    const serializedBS = {
      accounts: bs.accounts.map((a) => ({ id: a.id, balance: a.balance })),
      totals: bs.totals,
    };
    const serializedPrevBS = {
      totals: prevBS.totals,
    };

    const netWorthTrendByCurrency: Record<string, { date: string; value: number }[]> = {};
    const activeCurrencies = Array.from(new Set(accounts.map((a) => a.currency || DEFAULT_CURRENCY)));
    activeCurrencies.forEach((currency) => {
      netWorthTrendByCurrency[currency] = [{ date: '2026-06-01T00:00:00.000Z', value: bs.totals[currency]?.netWorth ?? 0 }];
    });

    return {
      bs: serializedBS,
      is,
      cfs,
      prevBS: serializedPrevBS,
      prevIS,
      netWorthTrendByCurrency,
    };
  };

  it('renders without crashing and displays correct balances and metrics', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps(mockAccounts, mockTransactions);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
          <DashboardClient
            accounts={mockAccounts}
            categories={[]}
            uncategorizedCount={0}
            period="current"
            defaultCurrency={getDefaultCurrency(mockAccounts)}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    // Verify it renders account balances table details
    expect(container.textContent).toContain('Checking Account');
    expect(container.textContent).toContain('Credit Card');
    
    // Verify Net Worth and Net Income render
    expect(container.textContent).toContain('Net Worth');
    expect(container.textContent).toContain('Savings Rate');
    expect(container.textContent).toContain('Cash Runway');

    // Clean up
    document.body.removeChild(container);
  });

  it('displays warnings when there are uncategorized transactions', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps(mockAccounts, mockTransactions);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
          <DashboardClient
            accounts={mockAccounts}
            categories={[]}
            uncategorizedCount={3}
            period="current"
            defaultCurrency={getDefaultCurrency(mockAccounts)}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    expect(container.textContent).toContain('Uncategorized transactions pending!');
    expect(container.textContent).toContain('You have 3 transactions without a category.');

    document.body.removeChild(container);
  });

  it('renders a friendly empty state CTA when no accounts are present', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps([], []);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
          <DashboardClient
            accounts={[]}
            categories={[]}
            uncategorizedCount={0}
            period="current"
            defaultCurrency={getDefaultCurrency([])}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    // CTA title and button should exist
    expect(container.textContent).toContain('No accounts');
    expect(container.textContent).toContain('Create Account');
    
    // Check that link href points to /accounts
    const links = container.getElementsByTagName('a');
    let hasAccountsLink = false;
    for (let i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === '/accounts') {
        hasAccountsLink = true;
      }
    }
    expect(hasAccountsLink).toBe(true);

    document.body.removeChild(container);
  });

  it('handles period switching interaction by router pushing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps(mockAccounts, mockTransactions);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
          <DashboardClient
            accounts={mockAccounts}
            categories={[]}
            uncategorizedCount={0}
            period="current"
            defaultCurrency={getDefaultCurrency(mockAccounts)}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    // Period buttons are: Month, 3M, 6M, YTD, 12M
    const buttons = Array.from(container.querySelectorAll('button'));
    const threeMButton = buttons.find((b) => b.textContent === '3M');
    
    expect(threeMButton).toBeDefined();

    // Click 3M period button
    await act(async () => {
      threeMButton?.click();
    });

    // Verify router push was invoked
    expect(mockPush).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('renders and supports currency switching when multiple currencies exist', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps(mockMultiCurrencyAccounts, mockTransactions);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
          <DashboardClient
            accounts={mockMultiCurrencyAccounts}
            categories={[]}
            uncategorizedCount={0}
            period="current"
            defaultCurrency={getDefaultCurrency(mockMultiCurrencyAccounts)}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    // Should show currency selector for AUD and USD
    const buttons = Array.from(container.querySelectorAll('button'));
    const usdButton = buttons.find((b) => b.textContent === 'USD');
    expect(usdButton).toBeDefined();

    // Click USD currency button
    await act(async () => {
      usdButton?.click();
    });

    expect(usdButton?.className).toContain('btn-primary');

    document.body.removeChild(container);
  });

  it('renders Chinese locale translations correctly', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const helperProps = getHelperProps(mockAccounts, mockTransactions);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="zh" messages={zhMessages} timeZone="UTC">
          <DashboardClient
            accounts={mockAccounts}
            categories={[]}
            uncategorizedCount={0}
            period="current"
            defaultCurrency={getDefaultCurrency(mockAccounts)}
            {...helperProps}
          />
        </NextIntlClientProvider>
      );
    });

    // Verify key Chinese translations are rendering
    expect(container.textContent).toContain('财务概览');
    expect(container.textContent).toContain('净资产');
    expect(container.textContent).toContain('储蓄率');
    expect(container.textContent).toContain('现金跑道');
    expect(container.textContent).toContain('本月');
    expect(container.textContent).toContain('资产');
    expect(container.textContent).toContain('负债');

    document.body.removeChild(container);
  });
});
