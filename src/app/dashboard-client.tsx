'use client';

import { useState } from 'react';
import { generateBalanceSheet, generateIncomeStatement } from '@/lib/reports';

interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  currency: string;
  category: { name: string; type: string } | null;
}

interface DashboardClientProps {
  initialAccounts: Account[];
  initialTransactions: Transaction[];
}

export default function DashboardClient({
  initialAccounts,
  initialTransactions,
}: DashboardClientProps) {
  const [accounts] = useState(initialAccounts);

  // Financial report dates (Current Month defaults)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Compile calculations
  const mappedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  }));

  const mappedTransactions = initialTransactions.map((t) => ({
    id: t.id,
    date: new Date(t.date),
    amount: t.amount,
    accountId: t.accountId,
    currency: t.currency,
    categoryId: null,
    category: t.category ? {
      id: '',
      name: t.category.name,
      type: t.category.type,
      cashFlowType: 'OPERATING',
    } : null,
  }));

  const bs = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDay);
  const is = generateIncomeStatement(mappedTransactions, firstDay, lastDay);

  // Uncategorized transactions count
  const pendingCount = initialTransactions.filter((tx) => !tx.category).length;

  // Visualizations State (Choose currency to render details for)
  const activeCurrencies = Array.from(new Set(accounts.map((a) => a.currency || 'AUD')));
  const [selectedVisualCurrency, setSelectedVisualCurrency] = useState('AUD');
  const currentVisualCurrency = activeCurrencies.includes(selectedVisualCurrency)
    ? selectedVisualCurrency
    : (activeCurrencies[0] || 'AUD');

  const visualIS = is.totals[currentVisualCurrency] || {
    income: [],
    expenses: [],
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="stats stats-vertical md:stats-horizontal shadow bg-base-100 w-full overflow-hidden">
        <div className="stat min-w-[280px]">
          <div className="stat-title text-base-content/60 font-bold">Net Worth</div>
          <div className="space-y-2 mt-2">
            {Object.keys(bs.totals).length === 0 ? (
              <div className="text-sm opacity-50 py-1">No accounts created</div>
            ) : (
              Object.entries(bs.totals).map(([currency, total]) => (
                <div key={currency} className="flex items-center justify-between border-b border-base-content/5 last:border-0 pb-1 last:pb-0">
                  <span className="badge badge-outline badge-sm font-bold">{currency}</span>
                  <span className={`text-xl font-extrabold ${total.netWorth >= 0 ? 'text-success' : 'text-error'}`}>
                    {total.netWorth >= 0 ? '' : '-'}${Math.abs(total.netWorth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stat min-w-[280px]">
          <div className="stat-title text-base-content/60 font-bold">Month Net Income</div>
          <div className="space-y-2 mt-2">
            {Object.keys(is.totals).length === 0 ? (
              <div className="text-sm opacity-50 py-1">No transactions this month</div>
            ) : (
              Object.entries(is.totals).map(([currency, total]) => (
                <div key={currency} className="flex items-center justify-between border-b border-base-content/5 last:border-0 pb-1 last:pb-0">
                  <span className="badge badge-outline badge-sm font-bold">{currency}</span>
                  <span className={`text-xl font-extrabold ${total.netIncome >= 0 ? 'text-success' : 'text-error'}`}>
                    {total.netIncome >= 0 ? '' : '-'}${Math.abs(total.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title text-base-content/60 font-bold">Review Queue</div>
          <div className="stat-value text-3xl text-warning font-extrabold mt-1">{pendingCount}</div>
          <div className="stat-desc mt-1">Uncategorized transactions</div>
        </div>
      </div>

      {/* Main expanded cards list */}
      <div className="space-y-6">
        {/* Managed Accounts table (expanded to take full width) */}
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-xl font-bold flex justify-between items-center text-primary">
              💰 Managed Accounts
            </h2>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                No accounts created yet. Please create an account in Accounts manager to start importing statement CSV files.
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="table w-full">
                  <thead>
                    <tr className="border-b border-base-200">
                      <th>Account Name</th>
                      <th>Type</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => {
                      const accBalance = bs.accounts.find((a) => a.id === acc.id)?.balance ?? acc.startingBalance;
                      return (
                        <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                          <td>
                            <div className="font-bold flex items-center gap-2">
                              {acc.name}
                              <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                            </div>
                            <div className="text-xs text-base-content/50">
                              {acc._count?.transactions || 0} transaction(s)
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-sm font-semibold`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className={`text-right font-mono font-bold ${accBalance >= 0 ? 'text-success' : 'text-error'}`}>
                            ${accBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        {/* SVG Visualizations: Income vs Expenses (expanded to take full width) */}
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-3 mb-2">
              <h2 className="card-title text-xl font-bold text-primary">📊 Cash Flow (Current Month)</h2>
              {activeCurrencies.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold opacity-60">Currency:</span>
                  <div className="join">
                    {activeCurrencies.map((cur) => (
                      <button
                        key={cur}
                        onClick={() => setSelectedVisualCurrency(cur)}
                        className={`btn btn-xs join-item ${currentVisualCurrency === cur ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-around gap-12 mt-4">
              {/* SVG comparison chart */}
              <div className="relative w-full max-w-md h-52 bg-base-200 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-base-content/50 font-bold uppercase tracking-wider">Inflows vs Outflows ({currentVisualCurrency})</div>
                
                {/* Simple SVG Chart */}
                <svg viewBox="0 0 200 100" className="w-full h-36">
                  {/* Income Bar */}
                  <rect x="40" y={100 - Math.min(80, (visualIS.totalIncome / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)} width="35" height={Math.min(80, (visualIS.totalIncome / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)} fill="hsl(var(--p))" rx="4" />
                  <text x="57" y="95" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold">In</text>
                  
                  {/* Expense Bar */}
                  <rect x="125" y={100 - Math.min(80, (visualIS.totalExpenses / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)} width="35" height={Math.min(80, (visualIS.totalExpenses / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)} fill="hsl(var(--s))" rx="4" />
                  <text x="142" y="95" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold">Out</text>
                </svg>

                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-primary">Inflow: ${visualIS.totalIncome.toFixed(0)}</span>
                  <span className="text-secondary">Outflow: ${visualIS.totalExpenses.toFixed(0)}</span>
                </div>
              </div>

              {/* Categories progress bars */}
              <div className="flex-1 w-full space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Top Expense Categories ({currentVisualCurrency})</h3>
                {visualIS.expenses.length === 0 ? (
                  <p className="text-xs text-base-content/50">No expenses recorded for this month.</p>
                ) : (
                  visualIS.expenses.slice(0, 4).map((exp) => {
                    const percentage = Math.round((exp.amount / Math.max(1, visualIS.totalExpenses)) * 100);
                    return (
                      <div key={exp.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{exp.name}</span>
                          <span>${exp.amount.toFixed(0)} ({percentage}%)</span>
                        </div>
                        <progress className="progress progress-secondary w-full" value={percentage} max="100"></progress>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
