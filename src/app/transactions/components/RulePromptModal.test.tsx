import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import RulePromptModal from './RulePromptModal';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnConfirm = vi.fn();

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

const mockCategories = [
  { id: 'cat_1', name: 'Transport', type: 'EXPENSE', cashFlowType: 'OPERATING', rules: [] },
];

function renderModal(
  isOpen: boolean,
  transaction: typeof mockTransaction | null,
  categoryId: string,
  isPending: boolean
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <RulePromptModal
          isOpen={isOpen}
          transaction={transaction}
          categoryId={categoryId}
          categories={mockCategories}
          isPending={isPending}
          onConfirm={mockOnConfirm}
        />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('RulePromptModal', () => {
  beforeEach(() => {
    mockOnConfirm.mockClear();
  });

  it('renders nothing when isOpen is false', () => {
    const container = renderModal(false, mockTransaction, 'cat_1', false);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when transaction is null', () => {
    const container = renderModal(true, null, 'cat_1', false);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal with correct payee and category info', () => {
    const container = renderModal(true, mockTransaction, 'cat_1', false);
    expect(container.textContent).toContain('Uber Ride');
    expect(container.textContent).toContain('Transport');
    expect(container.textContent).toContain('Create Auto-Categorization Rule');
  });

  it('has Create Rule and Skip buttons', () => {
    const container = renderModal(true, mockTransaction, 'cat_1', false);
    const buttons = container.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain('Create Rule');
    expect(buttonTexts).toContain('Skip');
  });

  it('calls onConfirm(true) when Create Rule is clicked', () => {
    const container = renderModal(true, mockTransaction, 'cat_1', false);
    const createRuleBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Create Rule'
    );
    act(() => createRuleBtn!.click());
    expect(mockOnConfirm).toHaveBeenCalledWith(true);
  });

  it('calls onConfirm(false) when Skip is clicked', () => {
    const container = renderModal(true, mockTransaction, 'cat_1', false);
    const skipBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Skip'
    );
    act(() => skipBtn!.click());
    expect(mockOnConfirm).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isPending is true', () => {
    const container = renderModal(true, mockTransaction, 'cat_1', true);
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });
});
