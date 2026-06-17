import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import TransactionTable from './TransactionTable';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock useLocaleContext
vi.mock('@/app/providers', () => ({
  useLocaleContext: () => ({ locale: 'en' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

const mockOnSort = vi.fn();
const mockOnToggleSelect = vi.fn();
const mockOnToggleSelectAll = vi.fn();
const mockOnCategoryChange = vi.fn();
const mockOnRowClick = vi.fn();
const mockOnPageChange = vi.fn();

const mockCategories = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
  { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', rules: [] },
];

const baseTransaction = {
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
  account: {
    id: 'acc_1',
    name: 'Checking',
    type: 'ASSET',
    currency: 'AUD',
    startingBalance: 1000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  category: null,
};

const mockTransactions = [
  baseTransaction,
  {
    ...baseTransaction,
    id: 'tx_2',
    payee: 'Salary Deposit',
    amount: 5000,
    categoryId: 'cat_2',
    isReviewed: true,
    category: { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' },
  },
  {
    ...baseTransaction,
    id: 'tx_3',
    payee: 'Coffee Shop',
    amount: -5.5,
    categoryId: 'cat_1',
    isReviewed: true,
    category: { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING' },
  },
];

const sortConfig = { sortBy: 'date', sortOrder: 'desc' as const };

const defaultProps = {
  transactions: mockTransactions,
  totalCount: 3,
  currentPage: 1,
  pageSize: 25,
  categories: mockCategories,
  isLoading: false,
  updatingTxId: null,
  selectedIds: [] as string[],
  sortConfig,
  onSort: mockOnSort,
  onToggleSelect: mockOnToggleSelect,
  onToggleSelectAll: mockOnToggleSelectAll,
  onCategoryChange: mockOnCategoryChange,
  onRowClick: mockOnRowClick,
  onPageChange: mockOnPageChange,
};

function renderTable(props: Partial<typeof defaultProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionTable {...defaultProps} {...props} />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('TransactionTable', () => {
  beforeEach(() => {
    mockOnSort.mockClear();
    mockOnToggleSelect.mockClear();
    mockOnToggleSelectAll.mockClear();
    mockOnCategoryChange.mockClear();
    mockOnRowClick.mockClear();
    mockOnPageChange.mockClear();
  });

  it('renders transactions in table rows', () => {
    const container = renderTable();
    expect(container.textContent).toContain('Uber Ride');
    expect(container.textContent).toContain('Salary Deposit');
    expect(container.textContent).toContain('Coffee Shop');
  });

  it('renders account names', () => {
    const container = renderTable();
    expect(container.textContent).toContain('Checking');
  });

  it('formats dates', () => {
    const container = renderTable();
    expect(container.textContent).toContain('06/01/2026');
  });

  it('renders pagination', () => {
    const container = renderTable({ totalCount: 50, transactions: mockTransactions });
    expect(container.textContent).toContain('Showing');
  });

  it('shows empty state when no transactions', () => {
    const container = renderTable({ transactions: [], totalCount: 0 });
    expect(container.textContent).toContain('No transactions found');
  });

  it('shows Upload icon in empty state', () => {
    const container = renderTable({ transactions: [], totalCount: 0 });
    expect(container.innerHTML).toContain('Upload Bank Statement');
  });

  it('renders sortable column headers', () => {
    const container = renderTable();
    const sortButtons = container.querySelectorAll('th button');
    expect(sortButtons.length).toBeGreaterThanOrEqual(4); // date, account, payee, category, amount
  });

  it('calls onSort when column header is clicked', () => {
    const container = renderTable();
    const dateHeader = Array.from(container.querySelectorAll('th button')).find(
      (b) => b.textContent?.includes('Date')
    );
    act(() => dateHeader!.click());
    expect(mockOnSort).toHaveBeenCalledWith('date');
  });

  it('selects all checkboxes when select-all is toggled', () => {
    const container = renderTable();
    const selectAllCheckbox = container.querySelector('thead input[type="checkbox"]')!;
    act(() => {
      selectAllCheckbox.click();
    });
    expect(mockOnToggleSelectAll).toHaveBeenCalled();
  });

  it('toggles individual checkbox on click', () => {
    const container = renderTable();
    const checkboxes = container.querySelectorAll('tbody input[type="checkbox"]');
    act(() => {
      checkboxes[0].click();
    });
    expect(mockOnToggleSelect).toHaveBeenCalled();
  });

  it('shows selected state on rows', () => {
    const container = renderTable({ selectedIds: ['tx_1'] });
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).toContain('bg-primary');
  });

  it('calls onRowClick when a row is clicked', () => {
    const container = renderTable();
    const rows = container.querySelectorAll('tbody tr');
    act(() => rows[0].click());
    expect(mockOnRowClick).toHaveBeenCalled();
  });

  it('shows uncategorized style for rows without category', () => {
    const container = renderTable();
    const rows = container.querySelectorAll('tbody tr');
    // First row (tx_1) is uncategorized, should have border-l-warning
    expect(rows[0].className).toContain('border-l-warning');
  });

  it('shows reviewed transactions without warning border', () => {
    const container = renderTable();
    const rows = container.querySelectorAll('tbody tr');
    // Second row (tx_2) is reviewed, no warning border
    expect(rows[1].className).not.toContain('border-l-warning');
  });

  it('shows skeleton loading rows when isLoading and no transactions', () => {
    const container = renderTable({ isLoading: true, transactions: [], totalCount: 0 });
    const skeletonRows = container.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show skeleton when isLoading but transactions exist', () => {
    const container = renderTable({ isLoading: true });
    const skeletonRows = container.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBe(0);
  });

  it('renders category select dropdowns for each row', () => {
    const container = renderTable();
    const selects = container.querySelectorAll('tbody select');
    expect(selects.length).toBe(mockTransactions.length);
  });

  it('shows spinner on updating row', () => {
    const container = renderTable({ updatingTxId: 'tx_1' });
    const firstRow = container.querySelector('tbody tr');
    expect(firstRow!.className).toContain('opacity-70');
  });
});
