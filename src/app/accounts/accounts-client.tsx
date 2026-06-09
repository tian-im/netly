'use client';

import { useState, useTransition, useMemo } from 'react';
import { createAccount, deleteAccount, updateAccount } from '../actions';
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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function AccountsClient({
  initialAccounts,
  initialTransactions,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  
  // Create Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('AUD');

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [editBalance, setEditBalance] = useState('');
  const [editCurrency, setEditCurrency] = useState('AUD');

  // Delete Confirm State
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Action Pending States
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Client-Side Sorting State
  const [sortField, setSortField] = useState<'name' | 'type' | 'balance' | 'transactions'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Compile calculations (Memoized)
  const mappedAccounts = useMemo(() => accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  })), [accounts]);

  const mappedTransactions = useMemo(() => initialTransactions.map((t) => ({
    ...t,
    date: new Date(t.date),
  })), [initialTransactions]);

  const bs = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return generateBalanceSheet(mappedAccounts, mappedTransactions, lastDay);
  }, [mappedAccounts, mappedTransactions]);

  // Sort logic applied to accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...accounts];
    sorted.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortField === 'balance') {
        valA = bs.accounts.find((x) => x.id === a.id)?.balance ?? a.startingBalance;
        valB = bs.accounts.find((x) => x.id === b.id)?.balance ?? b.startingBalance;
      } else if (sortField === 'transactions') {
        valA = a._count?.transactions || 0;
        valB = b._count?.transactions || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [accounts, sortField, sortDirection, bs.accounts]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      default: return '$';
    }
  };

  const handleSort = (field: 'name' | 'type' | 'balance' | 'transactions') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    setIsCreating(true);
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
        setNewAccType('ASSET');
        showToast(`Account "${created.name}" created successfully`);
      } catch (err: any) {
        showToast(err.message || 'Failed to create account', 'error');
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditType(acc.type as 'ASSET' | 'LIABILITY');
    setEditBalance(Math.abs(acc.startingBalance).toString());
    setEditCurrency(acc.currency);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;

    setIsUpdating(true);
    startTransition(async () => {
      try {
        const balance = parseFloat(editBalance) || 0;
        const updated = await updateAccount(
          editingAccount.id,
          editName,
          editType,
          editType === 'LIABILITY' ? -Math.abs(balance) : Math.abs(balance),
          editCurrency
        );
        setAccounts((prev) =>
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
        );
        showToast(`Account "${updated.name}" updated successfully`);
        setEditingAccount(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to update account', 'error');
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const handleDeleteClick = (acc: Account) => {
    setAccountToDelete(acc);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    const targetId = accountToDelete.id;
    const targetName = accountToDelete.name;

    setDeletingAccountId(targetId);
    startTransition(async () => {
      try {
        await deleteAccount(targetId);
        setAccounts((prev) => prev.filter((a) => a.id !== targetId));
        showToast(`Account "${targetName}" deleted successfully`);
        setAccountToDelete(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete account', 'error');
      } finally {
        setDeletingAccountId(null);
      }
    });
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-base-content/20 ml-1">↕</span>;
    return sortDirection === 'asc' ? <span className="text-primary ml-1">↑</span> : <span className="text-primary ml-1">↓</span>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
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
                  <caption className="sr-only">List of managed accounts and their balances</caption>
                  <thead>
                    <tr className="border-b border-base-200">
                      <th>
                        <button
                          onClick={() => handleSort('name')}
                          className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by account name"
                        >
                          Account Name <SortIndicator field="name" />
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => handleSort('type')}
                          className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by account type"
                        >
                          Type <SortIndicator field="type" />
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          onClick={() => handleSort('balance')}
                          className="font-bold flex items-center justify-end w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by account balance"
                        >
                          Balance <SortIndicator field="balance" />
                        </button>
                      </th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((acc) => {
                      const accBalance = bs.accounts.find((a) => a.id === acc.id)?.balance ?? acc.startingBalance;
                      const symbol = getCurrencySymbol(acc.currency);
                      const isDeleting = deletingAccountId === acc.id;
                      
                      return (
                        <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                          <td>
                            <div className="font-bold flex items-center gap-2">
                              {acc.name}
                              <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                            </div>
                            <div className="text-xs text-base-content/50">
                              <button
                                onClick={() => handleSort('transactions')}
                                className="hover:text-primary focus:outline-none cursor-pointer"
                                aria-label={`${acc._count?.transactions || 0} transactions. Click to sort.`}
                              >
                                {acc._count?.transactions || 0} transaction(s)
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-sm font-semibold`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className={`text-right font-mono font-bold ${accBalance >= 0 ? 'text-success' : 'text-error'}`}>
                            {accBalance < 0 ? '-' : ''}{symbol}{Math.abs(accBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(acc)}
                                className="btn btn-ghost btn-xs text-info hover:bg-info/10"
                                disabled={isPending}
                                aria-label={`Edit ${acc.name}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClick(acc)}
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                disabled={isPending}
                                aria-label={`Delete ${acc.name}`}
                              >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Currency Summary Footer Section */}
            {accounts.length > 0 && Object.keys(bs.totals).length > 0 && (
              <div className="mt-6 border-t border-base-200 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/50 mb-3">
                  Currency Summaries
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(bs.totals).map(([curr, total]) => {
                    const symbol = getCurrencySymbol(curr);
                    return (
                      <div key={curr} className="stats shadow bg-base-200 border border-base-300">
                        <div className="stat">
                          <div className="stat-title font-semibold text-xs flex justify-between items-center">
                            <span>Summary ({curr})</span>
                            <span className="badge badge-sm badge-outline font-bold text-[10px]">{curr}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">Assets</span>
                              <span className="font-bold text-success">
                                {symbol}{total.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">Liabilities</span>
                              <span className="font-bold text-error">
                                {symbol}{total.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">Net Worth</span>
                              <span className={`font-bold ${total.netWorth >= 0 ? 'text-success' : 'text-error'}`}>
                                {symbol}{total.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                <label className="label" htmlFor="new-account-name">
                  <span className="label-text font-bold">Account Name</span>
                </label>
                <input
                  id="new-account-name"
                  type="text"
                  placeholder="e.g. Commonwealth Checking"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-type">
                  <span className="label-text font-bold">Account Type</span>
                </label>
                <select
                  id="new-account-type"
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as 'ASSET' | 'LIABILITY')}
                  className="select select-bordered w-full"
                  disabled={isCreating}
                >
                  <option value="ASSET">ASSET (Cash, Savings, Checking)</option>
                  <option value="LIABILITY">LIABILITY (Credit Card, Loan, Debt)</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-currency">
                  <span className="label-text font-bold">Currency</span>
                </label>
                <select
                  id="new-account-currency"
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isCreating}
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
                <label className="label" htmlFor="new-account-balance">
                  <span className="label-text font-bold">Starting Balance</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-base-content/50" aria-hidden="true">
                    {getCurrencySymbol(newAccCurrency)}
                  </span>
                  <input
                    id="new-account-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="input input-bordered w-full pl-8"
                    disabled={isCreating}
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/40 whitespace-normal">
                    Use positive numbers. Liabilities will be stored as negative balances automatically.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-2"
                disabled={isCreating || !newAccName}
              >
                {isCreating ? 'Creating...' : 'Add Account'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="edit-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
              ✏️ Edit Account
            </h3>
            
            <form onSubmit={handleUpdateAccount} className="space-y-4 mt-4">
              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-name">
                  <span className="label-text font-bold">Account Name</span>
                </label>
                <input
                  id="edit-account-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-type">
                  <span className="label-text font-bold">Account Type</span>
                </label>
                <select
                  id="edit-account-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'ASSET' | 'LIABILITY')}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
                >
                  <option value="ASSET">ASSET (Cash, Savings, Checking)</option>
                  <option value="LIABILITY">LIABILITY (Credit Card, Loan, Debt)</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-currency">
                  <span className="label-text font-bold">Currency</span>
                </label>
                <select
                  id="edit-account-currency"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
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
                <label className="label" htmlFor="edit-account-balance">
                  <span className="label-text font-bold">Starting Balance</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-base-content/50" aria-hidden="true">
                    {getCurrencySymbol(editCurrency)}
                  </span>
                  <input
                    id="edit-account-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="input input-bordered w-full pl-8"
                    disabled={isUpdating}
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/40 whitespace-normal">
                    Use positive numbers. Liabilities will be stored as negative balances automatically.
                  </span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="btn btn-ghost"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating || !editName.trim()}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="delete-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              ⚠️ Confirm Delete
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              Are you sure you want to delete the account <strong className="text-base-content font-extrabold">"{accountToDelete.name}"</strong>?
              All of its associated transactions will be permanently deleted from the local database. This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="btn btn-ghost btn-sm"
                disabled={deletingAccountId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-error btn-sm"
                disabled={deletingAccountId !== null}
              >
                {deletingAccountId !== null ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Notification Container */}
      <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${t.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg border border-white/10`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
