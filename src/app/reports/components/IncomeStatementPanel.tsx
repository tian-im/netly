'use client';

import { useMemo } from 'react';
import { IncomeStatement, CategoryTotal } from '../types';

interface IncomeStatementPanelProps {
  report: IncomeStatement;
  comparisonReport: IncomeStatement | null;
  currency: string;
  onDrillDown: (title: string, options: { categoryName: string }) => void;
}

export default function IncomeStatementPanel({
  report,
  comparisonReport,
  currency,
  onDrillDown,
}: IncomeStatementPanelProps) {
  const totals = report.totals[currency] || {
    income: [],
    expenses: [],
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  };

  const priorTotals = comparisonReport?.totals[currency] || null;

  // Find prior value for a category name
  const getPriorCategoryAmount = (categoryName: string, isExpense: boolean): number => {
    if (!priorTotals) return 0;
    const list = isExpense ? priorTotals.expenses : priorTotals.income;
    const item = list.find((i) => i.name === categoryName);
    return item ? item.amount : 0;
  };

  // Sort categories descending by amount
  const sortedIncome = useMemo(() => {
    return [...totals.income].sort((a, b) => b.amount - a.amount);
  }, [totals.income]);

  const sortedExpenses = useMemo(() => {
    return [...totals.expenses].sort((a, b) => b.amount - a.amount);
  }, [totals.expenses]);

  // Visual ratio calculations
  const totalInFlowOutFlow = totals.totalIncome + totals.totalExpenses;
  const incomeRatio = useMemo(() => {
    if (totalInFlowOutFlow === 0) return 50;
    return (totals.totalIncome / totalInFlowOutFlow) * 100;
  }, [totals, totalInFlowOutFlow]);

  const expenseRatio = 100 - incomeRatio;

  const renderDelta = (current: number, prior: number, isExpense = false) => {
    if (!comparisonReport) return null;
    const delta = current - prior;
    if (delta === 0) return <span className="text-xs text-base-content/40 font-mono">0.00 (0%)</span>;

    const pctChange = prior !== 0 ? (delta / Math.abs(prior)) * 100 : 100;
    // For expenses, decrease is good/green, increase is bad/red.
    const isPositiveImpact = isExpense ? delta < 0 : delta > 0;

    return (
      <span className={`text-xs font-semibold font-mono ${isPositiveImpact ? 'text-success' : 'text-error'}`}>
        {delta > 0 ? '+' : ''}
        {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {' '}({delta > 0 ? '+' : ''}{pctChange.toFixed(0)}%)
      </span>
    );
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
      <input type="radio" name="reports-accordion" /> 
      <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
        <span>🧾 Income & Expense Statement ({currency})</span>
        <span className="text-sm font-semibold opacity-60">
          Net Income: ${totals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {priorTotals && (
            <span className="ml-2 pl-2 border-l border-base-300 text-xs text-base-content/50">
              Prior: ${priorTotals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </span>
      </div>
      <div className="collapse-content px-6 pb-6">
        <div className="divider my-0"></div>

        {/* Visual split progress bar */}
        {(totals.totalIncome > 0 || totals.totalExpenses > 0) && (
          <div className="mt-4 mb-6">
            <div className="flex justify-between text-xs font-bold mb-1 opacity-70">
              <span>Income ({incomeRatio.toFixed(0)}%)</span>
              <span>Expenses ({expenseRatio.toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-base-200 h-3 rounded-full overflow-hidden flex">
              <div className="bg-success h-full transition-all" style={{ width: `${incomeRatio}%` }}></div>
              <div className="bg-error h-full transition-all" style={{ width: `${expenseRatio}%` }}></div>
            </div>
            <div className="text-[10px] text-base-content/40 mt-1 text-center">
              Savings Rate: {totals.totalIncome > 0 ? ((totals.netIncome / totals.totalIncome) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Income Section */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-success border-b border-success/20 pb-2 mb-3">
              Revenue & Inflows
            </h3>
            <div className="space-y-3">
              {sortedIncome.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">No income recorded in range.</div>
              ) : (
                sortedIncome.map((inc) => {
                  const percentage = totals.totalIncome > 0 ? Math.round((inc.amount / totals.totalIncome) * 100) : 0;
                  const priorVal = getPriorCategoryAmount(inc.name, false);
                  return (
                    <div key={inc.name} className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => onDrillDown(inc.name, { categoryName: inc.name })}
                        className="hover:underline hover:text-success text-left font-medium focus:outline-none"
                      >
                        {inc.name} <span className="text-xs text-base-content/40 font-normal">({percentage}%)</span> 🔍
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-success">
                          ${inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {renderDelta(inc.amount, priorVal)}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>Total Revenue</span>
                <div className="flex flex-col items-end">
                  <span className="text-success">${totals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {priorTotals && renderDelta(totals.totalIncome, priorTotals.totalIncome)}
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-error border-b border-error/20 pb-2 mb-3">
              Expenses & Outflows
            </h3>
            <div className="space-y-3">
              {sortedExpenses.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">No expenses recorded in range.</div>
              ) : (
                sortedExpenses.map((exp) => {
                  const percentage = totals.totalExpenses > 0 ? Math.round((exp.amount / totals.totalExpenses) * 100) : 0;
                  const priorVal = getPriorCategoryAmount(exp.name, true);
                  return (
                    <div key={exp.name} className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => onDrillDown(exp.name, { categoryName: exp.name })}
                        className="hover:underline hover:text-error text-left font-medium focus:outline-none"
                      >
                        {exp.name} <span className="text-xs text-base-content/40 font-normal">({percentage}%)</span> 🔍
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-error">
                          ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {renderDelta(exp.amount, priorVal, true)}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>Total Expenses</span>
                <div className="flex flex-col items-end">
                  <span className="text-error">${totals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {priorTotals && renderDelta(totals.totalExpenses, priorTotals.totalExpenses, true)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
          <span className="font-extrabold text-md">NET INCOME</span>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-extrabold text-xl ${totals.netIncome >= 0 ? 'text-success' : 'text-error'}`}>
              ${totals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
            </span>
            {priorTotals && renderDelta(totals.netIncome, priorTotals.netIncome)}
          </div>
        </div>
      </div>
    </div>
  );
}
