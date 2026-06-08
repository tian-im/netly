'use client';

import { useState, useTransition } from 'react';
import { createAccount, deleteAccount, resetDatabase } from './actions';
import { generateBalanceSheet, generateIncomeStatement } from '@/lib/reports';

interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
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
  const [accounts, setAccounts] = useState(initialAccounts);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [isPending, startTransition] = useTransition();

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
  }));

  const mappedTransactions = initialTransactions.map((t) => ({
    id: t.id,
    date: new Date(t.date),
    amount: t.amount,
    accountId: t.accountId,
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    startTransition(async () => {
      try {
        const balance = parseFloat(newAccBalance) || 0;
        const created = await createAccount(
          newAccName,
          newAccType,
          newAccType === 'LIABILITY' ? -Math.abs(balance) : Math.abs(balance)
        );
        setAccounts((prev) => [...prev, created]);
        setNewAccName('');
        setNewAccBalance('');
      } catch (err: any) {
        alert(err.message || 'Failed to create account');
      }
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account and all its imported transactions?')) return;
    
    startTransition(async () => {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    });
  };

  const handleResetDb = async () => {
    if (!confirm('WARNING: This will wipe all accounts, transactions, and categories! Are you sure?')) return;
    
    startTransition(async () => {
      await resetDatabase();
      setAccounts([]);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="stats stats-vertical md:stats-horizontal shadow bg-base-100 w-full overflow-hidden">
        <div className="stat">
          <div className="stat-title text-base-content/60">Net Worth</div>
          <div className={`stat-value text-3xl font-extrabold ${bs.netWorth >= 0 ? 'text-success' : 'text-error'}`}>
            ${bs.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-desc mt-1">
            Assets: ${bs.totalAssets.toLocaleString()} | Liabilities: ${bs.totalLiabilities.toLocaleString()}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title text-base-content/60">Month Net Income</div>
          <div className={`stat-value text-3xl font-extrabold ${is.netIncome >= 0 ? 'text-success' : 'text-error'}`}>
            ${is.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-desc mt-1">
            Inflow: ${is.totalIncome.toLocaleString()} | Expenses: ${is.totalExpenses.toLocaleString()}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title text-base-content/60">Review Queue</div>
          <div className="stat-value text-3xl text-warning font-extrabold">{pendingCount}</div>
          <div className="stat-desc mt-1">Uncategorized transactions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Accounts Manager */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-xl font-bold flex justify-between items-center text-primary">
                💰 Managed Accounts
              </h2>
              
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  No accounts created yet. Please create an account to start importing statement CSV files.
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="table w-full">
                    <thead>
                      <tr className="border-b border-base-200">
                        <th>Account Name</th>
                        <th>Type</th>
                        <th className="text-right">Balance</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => {
                        const accBalance = bs.accounts.find((a) => a.id === acc.id)?.balance ?? acc.startingBalance;
                        return (
                          <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                            <td>
                              <div className="font-bold">{acc.name}</div>
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
                            <td className="text-center">
                              <button
                                onClick={() => handleDeleteAccount(acc.id)}
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                disabled={isPending}
                              >
                                Delete
                              </button>
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

          {/* SVG Visualizations: Income vs Expenses */}
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-xl font-bold text-primary">📊 Cash Flow (Current Month)</h2>
              <div className="flex flex-col md:flex-row items-center justify-around gap-6 mt-4">
                {/* SVG comparison chart */}
                <div className="relative w-full max-w-xs h-48 bg-base-200 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs text-base-content/50 font-bold uppercase tracking-wider">Inflows vs Outflows</div>
                  
                  {/* Simple SVG Chart */}
                  <svg viewBox="0 0 200 100" className="w-full h-32">
                    {/* Income Bar */}
                    <rect x="30" y={100 - Math.min(80, (is.totalIncome / Math.max(1, is.totalIncome + is.totalExpenses)) * 100)} width="35" height={Math.min(80, (is.totalIncome / Math.max(1, is.totalIncome + is.totalExpenses)) * 100)} fill="hsl(var(--p))" rx="4" />
                    <text x="47" y="95" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold">In</text>
                    
                    {/* Expense Bar */}
                    <rect x="135" y={100 - Math.min(80, (is.totalExpenses / Math.max(1, is.totalIncome + is.totalExpenses)) * 100)} width="35" height={Math.min(80, (is.totalExpenses / Math.max(1, is.totalIncome + is.totalExpenses)) * 100)} fill="hsl(var(--s))" rx="4" />
                    <text x="152" y="95" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold">Out</text>
                  </svg>

                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-primary">Inflow: ${is.totalIncome.toFixed(0)}</span>
                    <span className="text-secondary">Outflow: ${is.totalExpenses.toFixed(0)}</span>
                  </div>
                </div>

                {/* Categories progress bars */}
                <div className="flex-1 w-full space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Top Expense Categories</h3>
                  {is.expenses.length === 0 ? (
                    <p className="text-xs text-base-content/50">No expenses recorded for this month.</p>
                  ) : (
                    is.expenses.slice(0, 4).map((exp) => {
                      const percentage = Math.round((exp.amount / Math.max(1, is.totalExpenses)) * 100);
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

        {/* Right column: Actions Sidebar */}
        <div className="space-y-6">
          {/* Add Account Card */}
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-xl font-bold text-primary">➕ Create Account</h2>
              <form onSubmit={handleAddAccount} className="space-y-4 mt-2">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">Account Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Commonwealth Checking"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">Account Type</span>
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as 'ASSET' | 'LIABILITY')}
                    className="select select-bordered w-full"
                  >
                    <option value="ASSET">ASSET (Cash, Savings, Checking)</option>
                    <option value="LIABILITY">LIABILITY (Credit Card, Loan, Debt)</option>
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">Starting Balance</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-base-content/50">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newAccBalance}
                      onChange={(e) => setNewAccBalance(e.target.value)}
                      className="input input-bordered w-full pl-8"
                    />
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/40">
                      Use positive numbers. Liabilities will be stored as negative balances automatically.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full mt-2"
                  disabled={isPending || !newAccName}
                >
                  {isPending ? 'Creating...' : 'Add Account'}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Settings panel */}
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-xl font-bold text-error">⚠️ System Settings</h2>
              <p className="text-xs text-base-content/60">
                Manage database state. All data is kept locally on this machine.
              </p>
              <div className="mt-4">
                <button
                  onClick={handleResetDb}
                  className="btn btn-outline btn-error w-full gap-2"
                  disabled={isPending}
                >
                  🗑️ Wipe Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
