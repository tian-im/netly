import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import BulkActionPanel from './BulkActionPanel';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnClearSelection = vi.fn();
const mockOnBulkCategorize = vi.fn();

const mockCategories = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
  { id: 'cat_2', name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', rules: [] },
];

function renderBulkPanel(selectedCount: number, isPending: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <BulkActionPanel
          selectedCount={selectedCount}
          categories={mockCategories}
          isPending={isPending}
          onClearSelection={mockOnClearSelection}
          onBulkCategorize={mockOnBulkCategorize}
        />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('BulkActionPanel', () => {
  beforeEach(() => {
    mockOnClearSelection.mockClear();
    mockOnBulkCategorize.mockClear();
  });

  it('renders nothing when selectedCount is 0', () => {
    const container = renderBulkPanel(0, false);
    expect(container.innerHTML).toBe('');
  });

  it('shows selected count when > 0', () => {
    const container = renderBulkPanel(3, false);
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('selected');
  });

  it('renders category options in the select', () => {
    const container = renderBulkPanel(3, false);
    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    const options = select!.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts).toContain('Transport (Expense)');
    expect(optionTexts).toContain('Salary (Income)');
  });

  it('calls onClearSelection when clear button is clicked', () => {
    const container = renderBulkPanel(3, false);
    const clearBtn = container.querySelector('button');
    act(() => clearBtn!.click());
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('calls onBulkCategorize when a category is selected', () => {
    const container = renderBulkPanel(3, false);
    const select = container.querySelector('select')!;
    act(() => {
      select.value = 'cat_1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockOnBulkCategorize).toHaveBeenCalledWith('cat_1');
  });

  it('disables controls when isPending is true', () => {
    const container = renderBulkPanel(3, true);
    const select = container.querySelector('select');
    expect(select!.hasAttribute('disabled')).toBe(true);
    const clearBtn = container.querySelector('button');
    expect(clearBtn!.hasAttribute('disabled')).toBe(true);
  });
});
