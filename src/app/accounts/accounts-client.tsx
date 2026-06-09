'use client';

import { useState, useTransition } from 'react';
import { createAccount, deleteAccount } from '../actions';
import { generateBalanceSheet } from '@/lib/reports';

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
  date: Date | string;
  amount: number;
  accountId: string;
  currency: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

interface AccountsClientProps {
  initialAccounts: Account[];
  initialTransactions: Transaction[];
}

export default function AccountsClient({
  initialAccounts,
  initialTransactions,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('AUD');
  const [isPending, startTransition] = useTransition();

  // Financial report dates (Current Month defaults)
  const now = new Date();
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
    ...t,
    date: new Date(t.date),
  }));

  const bs = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDay);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    startTransition(async () => {
      try {
        const balance = parseFloat(newAccBalance) || 0;
        const created = await createAccount(
          newAccName,
          newAccType,
          newAccType === 'LIABILITY' ? -Math.abs(balance) : Math.abs(balance),
          newAccCurrency
        );
        setAccounts((prev) => [...prev, created]);
        setNewAccName('');
        setNewAccBalance('');
        setNewAccCurrency('AUD');
      } catch (err: any) {
        alert(err.message || 'Failed to create account');
      }
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account and all its imported transactions?')) return;
    
    startTransition(async () => {
      try {
        await deleteAccount(id);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete account');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: Accounts Manager */}
      <div className="lg:col-span-2">
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-xl font-bold flex justify-between items-center text-primary">
              💰 Managed Accounts
            </h2>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                No accounts created yet. Please create an account using the form to start importing statement CSV files.
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
      </div>

      {/* Right column: Create Account Form */}
      <div>
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
                  <span className="label-text font-bold">Currency</span>
                </label>
                <select
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="AUD">AUD (Australian Dollar)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="SGD">SGD (Singapore Dollar)</option>
                  <option value="NZD">NZD (New Zealand Dollar)</option>
                  <option value="CAD">CAD (Canadian Dollar)</option>
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
      </div>
    </div>
  );
}
