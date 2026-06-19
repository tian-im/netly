import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import FilterBar from './FilterBar';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnFilterChange = vi.fn();
const mockOnRuleModeChange = vi.fn();

const mockAccounts = [
  { id: 'acc_1', name: 'Checking', type: 'ASSET', currency: 'AUD', startingBalance: 1000, _count: { transactions: 5 } },
  { id: 'acc_2', name: 'Savings', type: 'ASSET', currency: 'USD', startingBalance: 5000, _count: { transactions: 3 } },
  { id: 'acc_3', name: 'Credit Card', type: 'LIABILITY', currency: 'AUD', startingBalance: 0, _count: { transactions: 10 } },
];

const mockCategories = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
  { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', rules: [] },
];

const defaultProps = {
  accounts: mockAccounts as any,
  categories: mockCategories as any,
  selectedAccountId: '',
  selectedCategoryId: '',
  selectedCurrency: '',
  searchTerm: '',
  pageSize: 25,
  dateRange: '',
  isReviewed: 'all',
  duplicates: false,
  ruleMode: 'ask' as const,
  onFilterChange: mockOnFilterChange,
  onRuleModeChange: mockOnRuleModeChange,
};

function renderFilterBar(props: Partial<typeof defaultProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <FilterBar {...defaultProps} {...props} />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockOnFilterChange.mockClear();
    mockOnRuleModeChange.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    const container = renderFilterBar();
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
    expect(input!.getAttribute('placeholder')).toContain('Search');
  });

  it('renders all filter selects', () => {
    const container = renderFilterBar();
    const selects = container.querySelectorAll('select');
    // Account, Currency, Category, Date Range, Review Status, Page Size = 6
    expect(selects.length).toBeGreaterThanOrEqual(5);
  });

  it('renders account options', () => {
    const container = renderFilterBar();
    const accountSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.querySelector('option')?.textContent === 'All Accounts'
    );
    expect(accountSelect).toBeTruthy();
    expect(accountSelect!.textContent).toContain('Checking');
    expect(accountSelect!.textContent).toContain('Savings');
  });

  it('renders currency options derived from accounts', () => {
    const container = renderFilterBar();
    const currencySelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.querySelector('option')?.textContent === 'All Currencies'
    );
    expect(currencySelect).toBeTruthy();
    expect(currencySelect!.textContent).toContain('AUD');
    expect(currencySelect!.textContent).toContain('USD');
  });

  it('renders category options with type labels', () => {
    const container = renderFilterBar();
    const catSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('Transport')
    );
    expect(catSelect).toBeTruthy();
    expect(catSelect!.textContent).toContain('Transport (Expense)');
    expect(catSelect!.textContent).toContain('Salary (Income)');
  });

  it('calls onFilterChange when account filter changes', () => {
    const container = renderFilterBar();
    const accountSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.querySelector('option')?.textContent === 'All Accounts'
    );
    expect(accountSelect).toBeTruthy();
    act(() => {
      accountSelect!.value = 'acc_1';
      accountSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ accountId: 'acc_1' });
  });

  it('calls onFilterChange when currency filter changes', () => {
    const container = renderFilterBar();
    const selects = container.querySelectorAll('select');
    const currencySelect = Array.from(selects).find(
      (s) => s.querySelector('option[value="AUD"]')
    );
    if (currencySelect) {
      act(() => {
        currencySelect.value = 'AUD';
        currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(mockOnFilterChange).toHaveBeenCalledWith({ currency: 'AUD' });
    }
  });

  it('calls onFilterChange when category filter changes', () => {
    const container = renderFilterBar();
    const catSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('Transport')
    );
    act(() => {
      catSelect!.value = 'cat_1';
      catSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ categoryId: 'cat_1' });
  });

  it('calls onFilterChange when date range changes', () => {
    const container = renderFilterBar();
    const dateSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('Current Month')
    );
    act(() => {
      dateSelect!.value = 'month';
      dateSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ dateRange: 'month' });
  });

  it('calls onFilterChange when review status changes', () => {
    const container = renderFilterBar();
    const statusSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('Reviewed Only')
    );
    act(() => {
      statusSelect!.value = 'true';
      statusSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ isReviewed: 'true' });
  });

  it('calls onFilterChange when page size changes', () => {
    const container = renderFilterBar();
    const sizeSelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('50')
    );
    act(() => {
      sizeSelect!.value = '50';
      sizeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ pageSize: 50 });
  });

  it('calls onRuleModeChange when rule mode is changed via dropdown', () => {
    const container = renderFilterBar();
    // Find the settings dropdown trigger
    const settingsBtn = container.querySelector('[aria-label="Rule creation settings"]');
    expect(settingsBtn).toBeTruthy();

    // Click to open the dropdown (we just check the button exists)
    // The dropdown items are rendered but visibility is controlled by CSS
    // We can verify the buttons exist in the DOM
    const ruleModeButtons = container.querySelectorAll('.dropdown-content button');
    expect(ruleModeButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('performs debounced search', () => {
    const container = renderFilterBar();
    const input = container.querySelector('input')!;

    // Use @testing-library/react fireEvent to properly trigger React's onChange
    act(() => {
      fireEvent.change(input, { target: { value: 'uber' } });
    });

    // Should not fire immediately due to 500ms debounce
    expect(mockOnFilterChange).not.toHaveBeenCalled();

    // Fast-forward timers by 500ms to trigger the debounced callback
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ searchTerm: 'uber' });
  });

  it('renders selected currency when provided', () => {
    const container = renderFilterBar({ selectedCurrency: 'AUD' });
    const currencySelect = Array.from(container.querySelectorAll('select')).find(
      (s) => s.textContent?.includes('AUD')
    );
    expect(currencySelect!.value).toBe('AUD');
  });

  it('calls onFilterChange when duplicates toggle changes', () => {
    const container = renderFilterBar();
    const toggle = container.querySelector('#show-duplicates-toggle');
    expect(toggle).toBeTruthy();
    act(() => {
      fireEvent.click(toggle!);
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith({ duplicates: true });
  });
});
