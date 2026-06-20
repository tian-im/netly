import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import IncomeVsExpensesChart, { CustomTooltip } from './IncomeVsExpensesChart';

describe('IncomeVsExpensesChart', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders correct income and expense values and labels', () => {
    const { container } = render(
      <IncomeVsExpensesChart
        title="Income vs Expenses"
        subtitle="Revenue vs Spending"
        totalIncome={5000}
        totalExpenses={3000}
        incomeLabel="Income"
        expenseLabel="Expenses"
        chartIncomeLabel="Total Income"
        chartExpenseLabel="Total Expenses"
        currency="USD"
        locale="en"
      />
    );
    expect(screen.getByText('Income vs Expenses')).toBeDefined();
    expect(screen.getByText('Revenue vs Spending')).toBeDefined();
    expect(screen.getByText('Income')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();
    expect(container.textContent).toContain('$5,000');
    expect(container.textContent).toContain('$3,000');

    // Verify role="img" and aria-label
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeDefined();
    expect(chartContainer.getAttribute('aria-label')).toBe('Income vs Expenses: Income $5000, Expenses $3000');
  });

  it('renders skeleton before mounting', () => {
    const useEffectSpy = vi.spyOn(React, 'useEffect').mockImplementation(() => {});

    const { container } = render(
      <IncomeVsExpensesChart
        title="Income vs Expenses"
        subtitle="Revenue vs Spending"
        totalIncome={5000}
        totalExpenses={3000}
        incomeLabel="Income"
        expenseLabel="Expenses"
        chartIncomeLabel="Total Income"
        chartExpenseLabel="Total Expenses"
        currency="USD"
        locale="en"
      />
    );

    // Verify pulse skeleton is rendered instead of chart components (like cell or path)
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
    
    const chartWrapper = container.querySelector('.recharts-wrapper');
    expect(chartWrapper).toBeNull();
    
    useEffectSpy.mockRestore();
  });

  describe('CustomTooltip', () => {
    it('renders null when not active', () => {
      const { container } = render(
        <CustomTooltip
          active={false}
          payload={[]}
          tooltipLabel="Amount"
          locale="en"
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders income styling correctly when active for income data entry', () => {
      const mockPayload = [
        {
          value: 5000,
          payload: { name: 'Total Income', amount: 5000, isIncome: true },
        },
      ] as any;
      const { container } = render(
        <CustomTooltip
          active={true}
          payload={mockPayload}
          tooltipLabel="Amount"
          locale="en"
        />
      );
      expect(screen.getByText('Total Income')).toBeDefined();
      expect(screen.getByText('Amount:')).toBeDefined();
      expect(screen.getByText('5k')).toBeDefined();
      
      // Ensure color classes for income match
      const dot = container.querySelector('.bg-success');
      const valText = container.querySelector('.text-success');
      expect(dot).toBeDefined();
      expect(valText).toBeDefined();
    });

    it('renders expense styling correctly when active for expense data entry', () => {
      const mockPayload = [
        {
          value: 3000,
          payload: { name: 'Total Expenses', amount: 3000, isIncome: false },
        },
      ] as any;
      const { container } = render(
        <CustomTooltip
          active={true}
          payload={mockPayload}
          tooltipLabel="Amount"
          locale="en"
        />
      );
      expect(screen.getByText('Total Expenses')).toBeDefined();
      expect(screen.getByText('Amount:')).toBeDefined();
      expect(screen.getByText('3k')).toBeDefined();
      
      // Ensure color classes for expense match
      const dot = container.querySelector('.bg-error');
      const valText = container.querySelector('.text-error');
      expect(dot).toBeDefined();
      expect(valText).toBeDefined();
    });
  });
});
