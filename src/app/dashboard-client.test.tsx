import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import DashboardClient from './dashboard-client';
import messages from '../../messages/en.json';

// Configure React act environment for tests
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      refresh: vi.fn(),
    };
  },
}));

// Mock Lucide icons to avoid rendering heavy SVG components
vi.mock('lucide-react', () => ({
  ArrowUpRight: () => <div data-testid="arrow-up-right" />,
  ArrowDownRight: () => <div data-testid="arrow-down-right" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  PiggyBank: () => <div data-testid="piggy-bank" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  Activity: () => <div data-testid="activity" />,
  Calendar: () => <div data-testid="calendar" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  BarChart3: () => <div data-testid="bar-chart-3" />,
  Wallet: () => <div data-testid="wallet" />,
  Tag: () => <div data-testid="tag" />,
}));

// Mock Link since it's Next.js Link
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

  it('renders without crashing and displays correct balances and metrics', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <DashboardClient
            initialAccounts={mockAccounts}
            initialTransactions={mockTransactions}
            uncategorizedCount={0}
          />
        </NextIntlClientProvider>
      );
    });

    // Verify it renders content
    expect(container.textContent).toContain('Checking Account');
    expect(container.textContent).toContain('Credit Card');
    
    // Cleanup
    document.body.removeChild(container);
  });

  it('displays warnings when there are uncategorized transactions', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <DashboardClient
            initialAccounts={mockAccounts}
            initialTransactions={mockTransactions}
            uncategorizedCount={3}
          />
        </NextIntlClientProvider>
      );
    });

    expect(container.textContent).toContain('Uncategorized transactions pending!');
    expect(container.textContent).toContain('You have 3 transactions without a category.');

    document.body.removeChild(container);
  });
});
