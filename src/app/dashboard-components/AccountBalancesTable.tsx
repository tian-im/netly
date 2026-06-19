'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Wallet, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getCurrencySymbol } from '@/lib/currencies';
import { useLocaleContext } from '@/app/providers';
import { buildAccountTransactionsUrl } from '@/lib/links';

import { Card } from '@/app/components/ui';

interface AccountItem {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  _count?: { transactions: number };
}

interface AccountBalancesTableProps {
  accounts: AccountItem[];
  calculatedBalances: Record<string, number>;
  /** Optional map of account id → uncategorized transaction count */
  uncategorizedCounts?: Record<string, number>;
}

type SortField = 'name' | 'balance';
type SortDir = 'asc' | 'desc';

export default function AccountBalancesTable({
  accounts,
  calculatedBalances,
  uncategorizedCounts = {},
}: AccountBalancesTableProps) {
  const t = useTranslations('dashboard');
  const { locale } = useLocaleContext();

  // WHY: Intl.Collator with the user's locale ensures CJK account names sort
  // in dictionary order rather than Unicode code-point order (Fix #1).
  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base' }), [locale]);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField]);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const sign = sortDir === 'asc' ? 1 : -1;
      // WHY: Pass locale to collator so Chinese account names sort in
      // dictionary order rather than Unicode code-point order (Fix #1).
      if (sortField === 'name') return sign * collator.compare(a.name, b.name);
      // balance sort — calculatedBalances[id] is a positive magnitude (asset value or liability owed)
      const balA = calculatedBalances[a.id] ?? a.startingBalance;
      const balB = calculatedBalances[b.id] ?? b.startingBalance;
      return sign * (balA - balB);
    });
  }, [accounts, calculatedBalances, sortField, sortDir, collator]);

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`cursor-pointer hover:text-primary transition-colors select-none ${className}`}
      onClick={() => toggleSort(field)}
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {label}
        {sortField === field && (
          <ArrowUpDown className={`h-3 w-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </th>
  );

  return (
    <Card shadow="lg">
      <Card.Body className="p-6">
        <Card.Title icon={<Wallet className="h-5 w-5" aria-hidden="true" />} className="text-lg">
          {t('accountBalances')}
        </Card.Title>

        {accounts.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            {t('noAccountsCreated')}
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="table w-full" role="table" aria-label={t('accountBalances')}>
              <thead>
                <tr className="border-b border-base-200">
                  <SortHeader field="name" label={t('accountName')} />
                  <SortHeader field="balance" label={t('accountBalance')} className="text-right" />
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((acc) => {
                  const calculatedBalance = calculatedBalances[acc.id] ?? acc.startingBalance;
                  const isDebt = acc.type === 'LIABILITY';
                  // calculatedBalance is a positive magnitude for both types:
                  //   Asset: how much money you hold; Liability: the amount you owe
                  const displayBalance = calculatedBalance;
                  const symbol = getCurrencySymbol(acc.currency);
                  const uncatCount = uncategorizedCounts[acc.id] || 0;

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-base-200/50 border-b border-base-200 transition-colors"
                    >
                      <td>
                        <Link
                          href={buildAccountTransactionsUrl(acc.id)}
                          className="block hover:opacity-80 transition-opacity"
                          aria-label={`${acc.name} — ${isDebt ? '' : (displayBalance < 0 ? '-' : '')}${symbol}${Math.abs(displayBalance).toLocaleString(locale, { minimumFractionDigits: 2 })}`}
                        >
                          <div className="font-bold text-sm sm:text-base text-base-content">
                            {acc.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                            <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-xs font-semibold`}>
                              {acc.type === 'ASSET' ? t('accountTypeAsset') : t('accountTypeLiability')}
                            </span>
                            <span className="text-xs text-base-content/40 font-normal">
                              • {t('transactionsCount', { count: acc._count?.transactions || 0 })}
                            </span>
                            {uncatCount > 0 && (
                              <span className="badge badge-warning badge-xs gap-1 font-semibold">
                                {t('uncategorizedBadge', { count: uncatCount })}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className={`text-right font-mono font-bold ${isDebt ? 'text-error' : (displayBalance >= 0 ? 'text-success' : 'text-error')}`}>
                        <Link
                          href={buildAccountTransactionsUrl(acc.id)}
                          className="block hover:opacity-80 transition-opacity"
                        >
                          {isDebt ? '' : (displayBalance < 0 ? '-' : '')}{symbol}{Math.abs(displayBalance).toLocaleString(locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
