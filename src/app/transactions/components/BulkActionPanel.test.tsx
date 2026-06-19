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
const mockOnBulkDelete = vi.fn();

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
          onBulkDelete={mockOnBulkDelete}
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
    mockOnBulkDelete.mockClear();
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
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => !b.textContent
    );
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
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => !b.textContent
    );
    expect(clearBtn!.hasAttribute('disabled')).toBe(true);

    const deleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete Selected'
    );
    expect(deleteBtn!.hasAttribute('disabled')).toBe(true);
  });

  it('opens DeleteConfirmModal when delete button is clicked and triggers onBulkDelete on confirmation', async () => {
    const container = renderBulkPanel(3, false);
    const deleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete Selected'
    );
    
    // Initially modal is not shown
    expect(document.body.textContent).not.toContain('Confirm Delete');

    act(() => deleteBtn!.click());

    // Now modal is open in the portal/body
    expect(document.body.textContent).toContain('Confirm Delete');

    const modalConfirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete Selected (3)'
    );

    await act(async () => {
      modalConfirmBtn!.click();
    });

    expect(mockOnBulkDelete).toHaveBeenCalledTimes(1);
  });
});
