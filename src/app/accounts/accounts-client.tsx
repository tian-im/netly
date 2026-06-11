'use client';

import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { createAccount, deleteAccount, updateAccount } from '../actions';
import { getCurrencySymbol } from '@/lib/currencies';
import { translateError } from '@/lib/translateError';
import { Wallet, ArrowUpDown, Plus, Pencil, AlertTriangle } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  _count?: { transactions: number };
}

interface AccountsClientProps {
  initialAccounts: Account[];
  initialTransactionSums: Record<string, number>;
  initialLastTxDates: Record<string, string | null>;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function AccountsClient({
  initialAccounts,
  initialTransactionSums,
  initialLastTxDates,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactionSums, setTransactionSums] = useState(initialTransactionSums);
  const [lastTxDates, setLastTxDates] = useState(initialLastTxDates);
  const t = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY'>('ALL');

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

  // Discard changes confirm Modal State
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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

  // Compile calculations (Memoized using aggregated transaction sums instead of thousands of transaction rows)
  const bs = useMemo(() => {
    const accountBalances = accounts.map((account) => {
      const netChange = transactionSums[account.id] || 0;
      const rawBalance = account.startingBalance + netChange;
      const balance = account.type === 'LIABILITY' ? -rawBalance : rawBalance;
      return {
        ...account,
        balance,
      };
    });

    const totals: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number }> = {};
    for (const account of accountBalances) {
      const currency = account.currency || 'AUD';
      if (!totals[currency]) {
        totals[currency] = { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
      }
      if (account.type === 'ASSET') {
        totals[currency].totalAssets += account.balance;
      } else if (account.type === 'LIABILITY') {
        totals[currency].totalLiabilities += account.balance;
      }
    }
    for (const currency of Object.keys(totals)) {
      totals[currency].netWorth = totals[currency].totalAssets - totals[currency].totalLiabilities;
    }
    return {
      accounts: accountBalances,
      totals,
    };
  }, [accounts, transactionSums]);

  // Filter accounts client-side by name search and type filter
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesSearch = !searchTerm.trim() || a.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [accounts, searchTerm, typeFilter]);

  // Sort logic applied to accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];
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
  }, [filteredAccounts, sortField, sortDirection, bs.accounts]);

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
        setTransactionSums((prev) => ({ ...prev, [created.id]: 0 }));
        setLastTxDates((prev) => ({ ...prev, [created.id]: null }));
        setSearchTerm('');
        setNewAccName('');
        setNewAccBalance('');
        setNewAccCurrency('AUD');
        setNewAccType('ASSET');
        showToast(t('createdSuccess', { name: created.name }));
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
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
        showToast(t('updatedSuccess', { name: updated.name }));
        setEditingAccount(null);
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
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
        showToast(t('deletedSuccess', { name: targetName }));
        setAccountToDelete(null);
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setDeletingAccountId(null);
      }
    });
  };

  const isEditDirty = useMemo(() => {
    if (!editingAccount) return false;
    return (
      editName !== editingAccount.name ||
      editType !== editingAccount.type ||
      editBalance !== Math.abs(editingAccount.startingBalance).toString() ||
      editCurrency !== editingAccount.currency
    );
  }, [editingAccount, editName, editType, editBalance, editCurrency]);

  const handleCancelEdit = () => {
    if (isEditDirty) {
      setShowDiscardConfirm(true);
    } else {
      setEditingAccount(null);
    }
  };

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    setEditingAccount(null);
  };

  const handleDiscardCancel = () => {
    setShowDiscardConfirm(false);
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-base-content/20 ml-1 inline-block" />;
    return sortDirection === 'asc' ? <span className="text-primary ml-1">↑</span> : <span className="text-primary ml-1">↓</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('title')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      {/* Left column: Accounts Manager */}
      <div className="lg:col-span-2">
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-xl font-bold flex justify-between items-center text-primary flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t('managedAccounts')}
              </span>
              
              {accounts.length > 0 && (
                <div className="flex items-center gap-2 w-full max-w-md justify-end">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="select select-bordered select-sm bg-base-200/50 focus:bg-base-100 font-normal text-xs text-base-content"
                    aria-label="Filter accounts by type"
                  >
                    <option value="ALL">{t('filterAllTypes')}</option>
                    <option value="ASSET">{t('filterAsset')}</option>
                    <option value="LIABILITY">{t('filterLiability')}</option>
                  </select>
                  <div className="relative w-full max-w-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base-content/40">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <input
                      type="text"
                      placeholder={tCommon('search') || 'Search accounts...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input input-bordered input-sm w-full pl-9 bg-base-200/50 focus:bg-base-100 transition-colors text-base-content font-normal text-xs"
                    />
                  </div>
                </div>
              )}
            </h2>

            {accounts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                {t('noAccountsCreatedYet')}
              </div>
            ) : sortedAccounts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                {tCommon('noResults') || 'No results found'}
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
                          {t('accountName')} <SortIndicator field="name" />
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => handleSort('type')}
                          className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by account type"
                        >
                          {t('type')} <SortIndicator field="type" />
                        </button>
                      </th>
                      <th className="text-center">
                        <button
                          onClick={() => handleSort('transactions')}
                          className="font-bold flex items-center justify-center w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by transaction count"
                        >
                          {t('transactionsCountHeader')} <SortIndicator field="transactions" />
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          onClick={() => handleSort('balance')}
                          className="font-bold flex items-center justify-end w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                          aria-label="Sort by account balance"
                        >
                          {t('balance')} <SortIndicator field="balance" />
                        </button>
                      </th>
                      <th className="text-center">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((acc) => {
                      const calculatedBalance = bs.accounts.find((a) => a.id === acc.id)?.balance;
                      const displayBalance = calculatedBalance !== undefined
                        ? (acc.type === 'LIABILITY' ? -calculatedBalance : calculatedBalance)
                        : acc.startingBalance;
                      const symbol = getCurrencySymbol(acc.currency);
                      const isDeleting = deletingAccountId === acc.id;
                      
                      return (
                        <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                          <td>
                            <div className="font-bold flex items-center gap-2">
                               {acc.name}
                              <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-sm font-semibold`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className="text-center font-semibold text-sm">
                            <div>{acc._count?.transactions || 0}</div>
                            <div className="text-[10px] text-base-content/40 font-normal mt-0.5">
                              {lastTxDates[acc.id] != null
                                ? t('lastActivity', { date: lastTxDates[acc.id]! })
                                : t('noActivity')}
                            </div>
                          </td>
                          <td className={`text-right font-mono font-bold ${displayBalance >= 0 ? 'text-success' : 'text-error'}`}>
                            {displayBalance < 0 ? '-' : ''}{symbol}{Math.abs(displayBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(acc)}
                                className="btn btn-ghost btn-sm text-info hover:bg-info/10"
                                disabled={isPending}
                                aria-label={`Edit ${acc.name}`}
                              >
                                {tCommon('edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(acc)}
                                className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                                disabled={isPending}
                                aria-label={`Delete ${acc.name}`}
                              >
                                {isDeleting ? t('deleting') : tCommon('delete')}
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
                  {t('currencySummaries')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(bs.totals).map(([curr, total]) => {
                    const symbol = getCurrencySymbol(curr);
                    return (
                      <div key={curr} className="stats shadow bg-base-200 border border-base-300">
                        <div className="stat">
                          <div className="stat-title font-semibold text-xs flex justify-between items-center">
                            <span>{t('summary', { currency: curr })}</span>
                            <span className="badge badge-sm badge-outline font-bold text-[10px]">{curr}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">{t('assets')}</span>
                              <span className="font-bold text-success">
                                {symbol}{total.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">{t('liabilities')}</span>
                              <span className="font-bold text-error">
                                {symbol}{total.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/50 block text-[10px] uppercase font-bold">{t('netWorth')}</span>
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
            <h2 className="card-title text-xl font-bold text-primary flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('createAccount')}
            </h2>
            <form onSubmit={handleAddAccount} className="space-y-4 mt-2">
              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-name">
                  <span className="label-text font-bold">{t('newAccountName')}</span>
                </label>
                <input
                  id="new-account-name"
                  type="text"
                  placeholder={t('newAccountNamePlaceholder')}
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-type">
                  <span className="label-text font-bold">{t('newAccountType')}</span>
                </label>
                <select
                  id="new-account-type"
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as 'ASSET' | 'LIABILITY')}
                  className="select select-bordered w-full"
                  disabled={isCreating}
                >
                  <option value="ASSET">{t('assetOption')}</option>
                  <option value="LIABILITY">{t('liabilityOption')}</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-currency">
                  <span className="label-text font-bold">{t('newAccountCurrency')}</span>
                </label>
                <select
                  id="new-account-currency"
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isCreating}
                >
                  <option value="AUD">{tCommon('currencyAud')}</option>
                  <option value="USD">{tCommon('currencyUsd')}</option>
                  <option value="EUR">{tCommon('currencyEur')}</option>
                  <option value="GBP">{tCommon('currencyGbp')}</option>
                  <option value="SGD">{tCommon('currencySgd')}</option>
                  <option value="NZD">{tCommon('currencyNzd')}</option>
                  <option value="CAD">{tCommon('currencyCad')}</option>
                  <option value="CNY">{tCommon('currencyCny')}</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="new-account-balance">
                  <span className="label-text font-bold">{t('newAccountBalance')}</span>
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
                    {t('balanceHelp')}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-2"
                disabled={isCreating || !newAccName}
              >
                {isCreating ? t('addingAccount') : t('addAccount')}
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
              <Pencil className="h-4 w-4" />
              {t('editAccount')}
            </h3>
            
            <form onSubmit={handleUpdateAccount} className="space-y-4 mt-4">
              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-name">
                  <span className="label-text font-bold">{t('newAccountName')}</span>
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
                  <span className="label-text font-bold">{t('newAccountType')}</span>
                </label>
                <select
                  id="edit-account-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'ASSET' | 'LIABILITY')}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
                >
                  <option value="ASSET">{t('assetOption')}</option>
                  <option value="LIABILITY">{t('liabilityOption')}</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-currency">
                  <span className="label-text font-bold">{t('newAccountCurrency')}</span>
                </label>
                <select
                  id="edit-account-currency"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
                >
                  <option value="AUD">{tCommon('currencyAud')}</option>
                  <option value="USD">{tCommon('currencyUsd')}</option>
                  <option value="EUR">{tCommon('currencyEur')}</option>
                  <option value="GBP">{tCommon('currencyGbp')}</option>
                  <option value="SGD">{tCommon('currencySgd')}</option>
                  <option value="NZD">{tCommon('currencyNzd')}</option>
                  <option value="CAD">{tCommon('currencyCad')}</option>
                  <option value="CNY">{tCommon('currencyCny')}</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-account-balance">
                  <span className="label-text font-bold">{t('newAccountBalance')}</span>
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
                    {t('balanceHelp')}
                  </span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-ghost"
                  disabled={isUpdating}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating || !editName.trim()}
                >
                  {isUpdating ? t('saving') : t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="delete-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('confirmDelete')}
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              {t('deleteWarning', { name: accountToDelete.name })}
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="btn btn-ghost btn-sm"
                disabled={deletingAccountId !== null}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-error btn-sm"
                disabled={deletingAccountId !== null}
              >
                {deletingAccountId !== null ? t('deleting') : t('deleteAccountBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="discard-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="discard-modal-title" className="font-bold text-lg text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {tCommon('confirm') || 'Confirm'}
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              {tCommon('discardChangesConfirm')}
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={handleDiscardCancel}
                className="btn btn-ghost btn-sm"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDiscardConfirm}
                className="btn btn-warning btn-sm"
              >
                {tCommon('confirm')}
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
