'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleContext } from '@/app/providers';
import { getTransactions } from '../../actions';
import { Search, X } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';

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
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost flex items-center justify-center" aria-label={tCommon('close')}>
            <X className="h-4 w-4" />
          </button>
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
          )}
        </div>

        <div className="modal-action border-t border-base-200 pt-3">
          <button onClick={onClose} className="btn btn-primary btn-sm">{tCommon('close')}</button>
        </div>
      </div>
    </div>
  );
}
