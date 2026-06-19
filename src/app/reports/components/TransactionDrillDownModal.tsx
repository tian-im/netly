'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleContext } from '@/app/providers';
import { getTransactions } from '../../actions';
import { Search, X } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/app/components/ui';

interface TransactionDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  startDateStr: string;
  endDateStr: string;
  currency: string;
  accountId?: string;
  categoryName?: string;
  cashFlowSection?: 'operating' | 'investing' | 'financing';
  cashFlowType?: 'inflow' | 'outflow';
}

interface DisplayTransaction {
  id: string;
  date: string;
  payee: string;
  description: string | null;
  accountName: string;
  categoryName: string;
  amount: number;
}

export default function TransactionDrillDownModal({
  isOpen,
  onClose,
  title,
  startDateStr,
  endDateStr,
  currency,
  accountId,
  categoryName,
  cashFlowSection,
  cashFlowType,
}: TransactionDrillDownModalProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const { locale } = useLocaleContext();
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ name: string; amount: number }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    startTransition(async () => {
      try {
        // Fetch matching transactions from database using server-side filtering
        const response = await getTransactions({
          accountId,
          startDateStr,
          endDateStr,
          currency,
          categoryName,
          cashFlowSection,
          cashFlowType,
        });
        const allTxs = response.transactions;

        // Map to display shape
        const mapped = allTxs.map((tx: any) => ({
          id: tx.id,
          date: new Date(tx.date).toISOString().split('T')[0],
          payee: tx.payee,
          description: tx.description,
          accountName: tx.account.name,
          categoryName: tx.category ? tx.category.name : t('drillDown.uncategorized'),
          amount: tx.amount,
        }));

        // Sort by date descending
        mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Compute category breakdown for cash flow drill-downs
        // WHY: When viewing cash flow sections (operating/investing/financing), users need to
        // see which categories contributed to the inflow/outflow totals — not just individual
        // transactions. The Income Statement panel already drills down per category, so this
        // brings the same level of detail to the Cash Flow drill-down.
        const breakdownMap = new Map<string, number>();
        for (const tx of mapped) {
          const key = tx.categoryName;
          breakdownMap.set(key, (breakdownMap.get(key) || 0) + Math.abs(tx.amount));
        }
        const breakdown = Array.from(breakdownMap.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount);
        setCategoryBreakdown(breakdown);
        setTransactions(mapped);
      } catch (err) {
        console.error('Failed to load drill-down transactions:', err);
      }
    });
  }, [isOpen, accountId, categoryName, cashFlowSection, cashFlowType, startDateStr, endDateStr, currency, t]);

  if (!isOpen) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <div className="modal modal-open z-[100]" role="dialog" aria-modal="true" aria-labelledby="drilldown-modal-title">
      <div className="modal-box max-w-4xl border border-base-200 shadow-2xl bg-base-100">
        <div className="flex justify-between items-center border-b border-base-200 pb-3">
          <h3 id="drilldown-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
            <Search className="h-5 w-5" /> {t('drillDown.title', { category: title })}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-circle flex items-center justify-center p-0"
            aria-label={tCommon('close')}
            icon={<X className="h-4 w-4" />}
          />
        </div>

        <div className="py-4">
          <div className="text-xs text-base-content/60 mb-4 flex flex-wrap gap-x-4 gap-y-1 bg-base-200 p-2.5 rounded-lg border border-base-300">
            <span>{t('drillDown.periodRange', { start: startDateStr, end: endDateStr })}</span>
            <span>{t('drillDown.currencyLabel', { currency })}</span>
          </div>

          {isPending ? (
            <div className="flex flex-col justify-center items-center py-12 gap-3">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <span className="text-sm font-semibold text-base-content/60">{t('drillDown.loading')}</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-base-content/50 text-sm">
              {t('drillDown.noTransactions')}
            </div>
          ) : (
            <>
              {/* Category breakdown summary — shown when the drill-down spans multiple categories (cash flow) */}
              {categoryBreakdown.length > 1 && cashFlowSection && (
                <div className="mb-4 p-3 bg-base-200/50 rounded-lg border border-base-300">
                  <div className="text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">
                    {t('drillDown.categoryBreakdown')}
                  </div>
                  <div className="space-y-1.5">
                    {categoryBreakdown.map((cat) => {
                      const totalFromBreakdown = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
                      const pct = totalFromBreakdown > 0 ? Math.round((cat.amount / totalFromBreakdown) * 100) : 0;
                      return (
                        <div key={cat.name} className="flex justify-between items-center text-xs">
                          <span className="font-medium truncate max-w-[200px]">{cat.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden inline-block">
                              <span
                                className="h-full bg-primary rounded-full block transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="font-mono font-semibold w-24 text-right">
                              {symbol}{cat.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-base-content/40 w-8 text-right">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                <table className="table table-sm table-pin-rows w-full">
                <thead>
                  <tr className="border-b border-base-200 bg-base-100">
                    <th>{t('drillDown.date')}</th>
                    <th>{t('drillDown.payee')}</th>
                    <th>{t('drillDown.account')}</th>
                    <th>{t('drillDown.category')}</th>
                    <th className="text-right">{t('drillDown.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-base-200/50 border-b border-base-200/50">
                      <td className="font-semibold whitespace-nowrap">{tx.date}</td>
                      <td>
                        <div className="font-bold">{tx.payee}</div>
                        {tx.description && <div className="text-[10px] text-base-content/50">{tx.description}</div>}
                      </td>
                      <td className="whitespace-nowrap">{tx.accountName}</td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-ghost badge-sm">{tx.categoryName}</span>
                      </td>
                      <td className={`text-right font-mono font-bold whitespace-nowrap ${tx.amount >= 0 ? 'text-success' : 'text-error'}`}>
                        {tx.amount < 0 ? '-' : ''}{symbol}{Math.abs(tx.amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        <div className="modal-action border-t border-base-200 pt-3">
          <Button onClick={onClose} variant="primary" size="sm">{tCommon('close')}</Button>
        </div>
      </div>
    </div>
  );
}
