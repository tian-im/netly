'use client';

import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { ArrowUpDown, ArrowUp, ArrowDown, Upload } from 'lucide-react';
import { Transaction, Category, SortConfig } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  selectedIds: string[];
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onCategoryChange: (transaction: Transaction, categoryId: string) => void;
  onRowClick: (transaction: Transaction) => void;
}

export default function TransactionTable({
  transactions,
  categories,
  isLoading,
  selectedIds,
  sortConfig,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onCategoryChange,
  onRowClick,
}: TransactionTableProps) {
  const t = useTranslations('transactions');
  const format = useFormatter();

  const isAllSelected =
    transactions.length > 0 &&
    transactions.every((tx) => selectedIds.includes(tx.id));

  const SortHeader = ({
    field,
    label,
    className = '',
  }: {
    field: string;
    label: string;
    className?: string;
  }) => {
    const isSorted = sortConfig.sortBy === field;
    return (
      <th className={`${className} p-0`}>
        <button
          type="button"
          onClick={() => onSort(field)}
          className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer w-full text-left py-3 px-4 font-bold text-xs uppercase select-none focus:outline-hidden"
          aria-label={`Sort by ${label}`}
        >
          <span>{label}</span>
          {isSorted ? (
            sortConfig.sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 shrink-0" />
          )}
        </button>
      </th>
    );
  };

  const formatAmount = (tx: Transaction) => {
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: tx.account.currency || 'AUD',
    }).format(Math.abs(tx.amount));
    return `${tx.amount >= 0 ? '+' : '-'}${formatted}`;
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table w-full table-zebra table-md">
          <thead>
            <tr className="border-b border-base-200 bg-base-200/50">
              <th className="w-12 text-center">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  disabled={isLoading || transactions.length === 0}
                  aria-label="Select all transactions on this page"
                />
              </th>
              <SortHeader field="date" label={t('table.date')} className="w-28" />
              <SortHeader field="account" label={t('table.account')} className="w-36" />
              <SortHeader field="payee" label={t('table.payee')} />
              <SortHeader field="category" label={t('table.category')} className="w-48" />
              <SortHeader field="amount" label={t('table.amount')} className="text-right w-40" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton shimmer rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-base-200">
                  <td className="py-4 text-center">
                    <div className="h-4 w-4 bg-base-300 rounded-sm mx-auto" />
                  </td>
                  <td>
                    <div className="h-3.5 w-16 bg-base-300 rounded-md" />
                  </td>
                  <td>
                    <div className="h-3.5 w-24 bg-base-300 rounded-md" />
                  </td>
                  <td>
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-base-300 rounded-md" />
                      <div className="h-3 w-32 bg-base-300 rounded-md" />
                    </div>
                  </td>
                  <td>
                    <div className="h-8 w-full bg-base-300 rounded-lg" />
                  </td>
                  <td className="text-right">
                    <div className="h-4 w-20 bg-base-300 rounded-md ml-auto" />
                  </td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20 text-base-content/40">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-base-200 p-4 rounded-full border border-base-300">
                      <Upload className="w-8 h-8 text-base-content/50" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-base-content/75">{t('noTransactions')}</h3>
                    </div>
                    <Link href="/import" className="btn btn-primary btn-sm mt-2">
                      {t('uploadStatement')}
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const isUncategorized = !tx.categoryId;
                const formattedDate = format.dateTime(new Date(tx.date), {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onRowClick(tx)}
                    className={`cursor-pointer hover:bg-base-200/50 border-b border-base-200 transition-colors ${
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''
                    } ${
                      !tx.isReviewed ? 'border-l-4 border-l-warning' : ''
                    }`}
                  >
                    {/* Checkbox column */}
                    <td
                      className="text-center"
                      onClick={(e) => e.stopPropagation()} // Prevent drawer from opening
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={isSelected}
                        onChange={() => onToggleSelect(tx.id)}
                        aria-label={`Select transaction with payee ${tx.payee}`}
                      />
                    </td>

                    {/* Date */}
                    <td className="font-mono text-xs text-base-content/70">
                      {formattedDate}
                    </td>

                    {/* Account */}
                    <td className="text-xs font-semibold break-words max-w-[150px]">
                      {tx.account.name}
                    </td>

                    {/* Payee + Description */}
                    <td>
                      <div className="font-bold text-sm text-base-content break-words max-w-[400px]">
                        {tx.payee}
                      </div>
                      {tx.description && (
                        <div className="text-xs text-base-content/50 break-words mt-0.5 max-w-[400px] font-mono">
                          {tx.description}
                        </div>
                      )}
                    </td>

                    {/* Category Selector */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={tx.categoryId || ''}
                        onChange={(e) => onCategoryChange(tx, e.target.value)}
                        className={`select select-bordered select-xs w-full font-semibold ${
                          isUncategorized ? 'select-warning text-warning-content' : ''
                        }`}
                        disabled={isLoading}
                        aria-label={`Change category for transaction with payee ${tx.payee}`}
                      >
                        <option value="">{t('table.uncategorized')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Amount */}
                    <td
                      className={`text-right font-mono font-bold text-sm ${
                        tx.amount >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {formatAmount(tx)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
