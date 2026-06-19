import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import enMessages from '../../../../messages/en.json';
import { Transaction, Category } from '../types';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnClose = vi.fn();
const mockOnCategoryChange = vi.fn();

// Mock useLocaleContext
vi.mock('@/app/providers', () => ({
  useLocaleContext: () => ({ locale: 'en' }),
}));

const mockCategories: Category[] = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
  { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', rules: [] },
];

const mockTransactionWithCategory: Transaction = {
  id: 'tx_1',
  date: new Date('2026-06-01T00:00:00.000Z'),
  payee: 'Uber Ride',
  description: 'Ride to airport',
  amount: -25.5,
  accountId: 'acc_1',
  categoryId: 'cat_1',
  isReviewed: true,
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  createdAt: new Date('2026-06-01T00:00:00.000Z'),
  account: {
    id: 'acc_1',
    name: 'Checking',
    type: 'ASSET',
    currency: 'AUD',
    startingBalance: 1000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  category: { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING' },
};

const mockTransactionUncategorized: Transaction = {
  ...mockTransactionWithCategory,
  id: 'tx_2',
  categoryId: null,
  isReviewed: false,
  category: null,
};

function renderDrawer(
  transaction: Transaction | null,
  isPending: boolean
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionDetailDrawer
          transaction={transaction}
          categories={mockCategories}
          isPending={isPending}
          onClose={mockOnClose}
          onCategoryChange={mockOnCategoryChange}
        />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('TransactionDetailDrawer', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnCategoryChange.mockClear();
  });

  it('renders nothing when transaction is null', () => {
    const container = renderDrawer(null, false);
    expect(container.innerHTML).toBe('');
  });

  it('renders transaction payee and amount', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('Uber Ride');
    expect(container.textContent).toContain('$');
  });

  it('shows negative amount with minus sign', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('-');
  });

  it('shows positive amount with plus sign', () => {
    const positiveTx = { ...mockTransactionWithCategory, amount: 1000 };
    const container = renderDrawer(positiveTx, false);
    expect(container.textContent).toContain('+');
  });

  it('renders description when present', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('Ride to airport');
  });

  it('renders the currency code', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('AUD');
  });

  it('shows reviewed badge for reviewed transactions', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('Reviewed');
  });

  it('shows needs review badge for uncategorized transactions', () => {
    const container = renderDrawer(mockTransactionUncategorized, false);
    expect(container.textContent).toContain('Needs Review');
  });

  it('renders category options in the select', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select!.textContent).toContain('Transport (Expense)');
    expect(select!.textContent).toContain('Salary (Income)');
  });

  it('shows account name and type', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    expect(container.textContent).toContain('Checking');
    expect(container.textContent).toContain('Asset');
  });

  it('calls onClose when backdrop is clicked', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    // Click the backdrop (the div with onClick handler)
    const backdrop = container.querySelector('.bg-base-300\\/40');
    if (backdrop) {
      act(() => backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('calls onClose when close button is clicked', () => {
    const container = renderDrawer(mockTransactionWithCategory, false);
    const closeBtn = container.querySelector('button');
    act(() => (closeBtn as any)!.click());
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables category select when isPending is true', () => {
    const container = renderDrawer(mockTransactionWithCategory, true);
    const select = container.querySelector('select');
    expect(select!.hasAttribute('disabled')).toBe(true);
  });
});
