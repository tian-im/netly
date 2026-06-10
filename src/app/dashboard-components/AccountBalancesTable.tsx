'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getCurrencySymbol } from '@/lib/currencies';

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
}

export default function AccountBalancesTable({
  accounts,
  calculatedBalances,
}: AccountBalancesTableProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="card bg-base-100 shadow-lg border border-base-200">
      <div className="card-body p-6">
        <h2 className="card-title text-lg font-bold flex justify-between items-center text-primary">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5" aria-hidden="true" />
            {t('accountBalances')}
          </span>
        </h2>

        {accounts.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            {t('noAccountsCreated')}
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-base-200">
                  <th>{t('accountName')}</th>
                  <th>{t('accountType')}</th>
                  <th className="text-right">{t('accountBalance')}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const calculatedBalance = calculatedBalances[acc.id];
                  const displayBalance = calculatedBalance !== undefined
                    ? (acc.type === 'LIABILITY' ? -calculatedBalance : calculatedBalance)
                    : acc.startingBalance;
                  const symbol = getCurrencySymbol(acc.currency);

                  return (
                    <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                      <td>
                        <div className="font-bold flex items-center gap-2">
                          {acc.name}
                          <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                        </div>
                        <div className="text-xs text-base-content/50">
                          {t('transactionsCount', { count: acc._count?.transactions || 0 })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-sm font-semibold`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className={`text-right font-mono font-bold ${displayBalance >= 0 ? 'text-success' : 'text-error'}`}>
                        {displayBalance < 0 ? '-' : ''}{symbol}{Math.abs(displayBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
