'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { IncomeStatement } from '../types';
import { Receipt, Search } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';
import { RenderDelta } from '@/lib/render-delta';

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
  const t = useTranslations('reports');
  const totals = report.totals[currency] || {
    income: [],
    expenses: [],
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  };

  const priorTotals = comparisonReport?.totals[currency] || null;
  const symbol = getCurrencySymbol(currency);

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

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
      <input type="radio" name="reports-accordion" /> 
      <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
        <span className="flex items-center gap-2">
          <Receipt className="h-5 w-5" /> {t('incomeStatement.title')} ({currency})
        </span>
        <span className="text-sm font-semibold opacity-60">
          {t('incomeStatement.netIncomeShort')}: {symbol}{totals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {priorTotals && (
            <span className="ml-2 pl-2 border-l border-base-300 text-xs text-base-content/50">
              {t('balanceSheet.prior')}{symbol}{priorTotals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              <span>{t('incomeStatement.incomeShort')} ({incomeRatio.toFixed(0)}%)</span>
              <span>{t('incomeStatement.expensesShort')} ({expenseRatio.toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-base-200 h-3 rounded-full overflow-hidden flex">
              <div className="bg-success h-full transition-all" style={{ width: `${incomeRatio}%` }}></div>
              <div className="bg-error h-full transition-all" style={{ width: `${expenseRatio}%` }}></div>
            </div>
            <div className="text-[10px] text-base-content/40 mt-1 text-center">
              {t('incomeStatement.savingsRate', {
                rate: totals.totalIncome > 0 ? ((totals.netIncome / totals.totalIncome) * 100).toFixed(1) : '0.0'
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Income Section */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-success border-b border-success/20 pb-2 mb-3">
              {t('incomeStatement.revenueInflow')}
            </h3>
            <div className="space-y-3">
              {sortedIncome.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">{t('incomeStatement.noIncome')}</div>
              ) : (
                sortedIncome.map((inc) => {
                  const percentage = totals.totalIncome > 0 ? Math.round((inc.amount / totals.totalIncome) * 100) : 0;
                  const priorVal = getPriorCategoryAmount(inc.name, false);
                  return (
                    <div key={inc.name} className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => onDrillDown(inc.name, { categoryName: inc.name })}
                        className="hover:underline hover:text-success text-left font-medium focus:outline-none flex items-center gap-1"
                      >
                        {inc.name} <span className="text-xs text-base-content/40 font-normal">({percentage}%)</span> <Search className="h-3 w-3 opacity-60" />
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-success">
                          {symbol}{inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <RenderDelta current={inc.amount} prior={priorVal} showDelta={!!comparisonReport} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>{t('incomeStatement.totalIncome')}</span>
                <div className="flex flex-col items-end">
                  <span className="text-success">{symbol}{totals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <RenderDelta current={totals.totalIncome} prior={priorTotals ? priorTotals.totalIncome : 0} showDelta={!!comparisonReport} />
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-error border-b border-error/20 pb-2 mb-3">
              {t('incomeStatement.expensesOutflow')}
            </h3>
            <div className="space-y-3">
              {sortedExpenses.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">{t('incomeStatement.noExpenses')}</div>
              ) : (
                sortedExpenses.map((exp) => {
                  const percentage = totals.totalExpenses > 0 ? Math.round((exp.amount / totals.totalExpenses) * 100) : 0;
                  const priorVal = getPriorCategoryAmount(exp.name, true);
                  return (
                    <div key={exp.name} className="flex justify-between items-center text-sm">
                      <button
                        onClick={() => onDrillDown(exp.name, { categoryName: exp.name })}
                        className="hover:underline hover:text-error text-left font-medium focus:outline-none flex items-center gap-1"
                      >
                        {exp.name} <span className="text-xs text-base-content/40 font-normal">({percentage}%)</span> <Search className="h-3 w-3 opacity-60" />
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-error">
                          {symbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <RenderDelta current={exp.amount} prior={priorVal} showDelta={!!comparisonReport} reverseImpact={true} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>{t('incomeStatement.totalExpenses')}</span>
                <div className="flex flex-col items-end">
                  <span className="text-error">{symbol}{totals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <RenderDelta current={totals.totalExpenses} prior={priorTotals ? priorTotals.totalExpenses : 0} showDelta={!!comparisonReport} reverseImpact={true} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
          <span className="font-extrabold text-md">{t('incomeStatement.netIncomeShort')}</span>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-extrabold text-xl ${totals.netIncome >= 0 ? 'text-success' : 'text-error'}`}>
              {symbol}{totals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
            </span>
            <RenderDelta current={totals.netIncome} prior={priorTotals ? priorTotals.netIncome : 0} showDelta={!!comparisonReport} />
          </div>
        </div>
      </div>
    </div>
  );
}
