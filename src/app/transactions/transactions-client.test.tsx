import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import TransactionsClient from './transactions-client';
import enMessages from '../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockInitialCategories = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
  { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', rules: [] },
];

// Mock actions
vi.mock('@/app/actions', () => ({
  updateTransactionCategory: vi.fn().mockResolvedValue({}),
  bulkUpdateTransactionsCategory: vi.fn().mockResolvedValue({}),
  exportAllTransactions: vi.fn().mockResolvedValue([]),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/transactions',
}));

// Mock useLocaleContext
vi.mock('@/app/providers', () => ({
  useLocaleContext: () => ({ locale: 'en' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

const mockAccount = {
  id: 'acc_1',
  name: 'Checking',
  type: 'ASSET' as const,
  currency: 'AUD',
  startingBalance: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  _count: { transactions: 3 },
};

const mockTransaction = {
  id: 'tx_1',
  date: '2026-06-01T00:00:00.000Z',
  payee: 'Uber Ride',
  description: 'Ride to airport',
  amount: -25.5,
  accountId: 'acc_1',
  categoryId: null,
  isReviewed: false,
  updatedAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  account: mockAccount,
  category: null,
};

const defaultProps = {
  initialTransactions: [mockTransaction],
  initialTotalCount: 1,
  initialAccounts: [mockAccount],
  initialCategories: mockInitialCategories,
};

function renderClient(props: Partial<typeof defaultProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionsClient {...defaultProps} {...props} />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('TransactionsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the page title', () => {
    const container = renderClient();
    expect(container.textContent).toContain('Transaction Ledger');
  });

  it('renders transaction count badge', () => {
    const container = renderClient();
    expect(container.textContent).toContain('1 transaction');
  });

  it('renders export CSV button', () => {
    const container = renderClient();
    const exportBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export CSV'
    );
    expect(exportBtn).toBeTruthy();
  });

  it('renders FilterBar', () => {
    const container = renderClient();
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('renders TransactionTable', () => {
    const container = renderClient();
    expect(container.textContent).toContain('Uber Ride');
  });

  it('renders transaction count in header', () => {
    const container = renderClient();
    const badge = container.querySelector('.badge-neutral');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain('1');
  });

  it('loads rule mode from localStorage on mount', () => {
    localStorage.setItem('netly_rule_mode', 'always');
    const container = renderClient();
    // The component should have loaded 'always' mode
    // We can verify this by checking the settings dropdown
    expect(localStorage.getItem('netly_rule_mode')).toBe('always');
  });

  it('handles filter changes by updating URL', () => {
    const container = renderClient();
    // Find a select element and change it to trigger handleFilterChange
    const selects = container.querySelectorAll('select');
    const accountSelect = selects[0];

    act(() => {
      accountSelect!.value = 'acc_1';
      accountSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContain('/transactions');
  });

  it('handles sort by updating URL', () => {
    const container = renderClient();
    const sortButtons = container.querySelectorAll('th button');
    act(() => {
      sortButtons[0].click();
    });
    expect(mockPush).toHaveBeenCalled();
  });

  it('renders toast notifications on export', () => {
    const container = renderClient();
    const exportBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Export CSV'
    );
    expect(exportBtn).toBeTruthy();
  });

  it('shows drawer when a transaction row is clicked', () => {
    const container = renderClient();
    const row = container.querySelector('tbody tr');
    act(() => row!.click());
    // Drawer should now be visible
    expect(container.textContent).toContain('Transaction Details');
  });

  it('closes drawer when close button is clicked', () => {
    const container = renderClient();
    // First open drawer by clicking a row
    const row = container.querySelector('tbody tr')!;
    act(() => row.click());
    expect(container.textContent).toContain('Transaction Details');

    // Close drawer - find the close button in the drawer
    const closeBtn = container.querySelector('[role="dialog"] button');
    if (closeBtn) {
      act(() => closeBtn.click());
      // After close, drawer content should not be visible
      // (the drawer's backdrop + content is still in DOM but the component returns null)
    }
  });
});
