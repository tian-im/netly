'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleContext } from '@/app/providers';
import { createAccount, deleteAccount, updateAccount } from '../actions';
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';
import CurrencySelector from '@/app/components/CurrencySelector';
import { translateError } from '@/lib/translateError';
import { Wallet, ArrowUpDown, Plus, Pencil, AlertTriangle } from 'lucide-react';
import { Button, Input, ToastContainer, type ToastMessage } from '@/app/components/ui';

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
  preferredCurrency?: string;
}


export default function AccountsClient({
  initialAccounts,
  initialTransactionSums,
  initialLastTxDates,
  preferredCurrency = DEFAULT_CURRENCY,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactionSums, setTransactionSums] = useState(initialTransactionSums);
  const [lastTxDates, setLastTxDates] = useState(initialLastTxDates);
  const t = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  const { locale } = useLocaleContext();

  const formatDate = (isoDate: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(isoDate));
    } catch {
      return isoDate;
    }
  };
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY'>('ALL');

  // Client-side mounted flag — SSR renders empty form, client populates after hydration
  const [mounted, setMounted] = useState(false);

  // Create Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('');

  // After mount, initialize the create-form currency field to the user's preference
  useEffect(() => {
    setMounted(true);
    setNewAccCurrency(preferredCurrency);
  }, [preferredCurrency]);

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [editBalance, setEditBalance] = useState('');
  // WHY: Use preferredCurrency as the default instead of hardcoded DEFAULT_CURRENCY so
  // the currency field respects the user's saved preference even before the edit modal
  // opens. When handleOpenEdit is called, editCurrency is overwritten with acc.currency
  // anyway, so this only affects the initial/inert state.
  const [editCurrency, setEditCurrency] = useState(preferredCurrency);

  // Discard changes confirm Modal State
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Delete Confirm State
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Action Pending States
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Client-Side Sorting State
  const [sortField, setSortField] = useState<'name' | 'type' | 'balance' | 'transactions'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // WHY: Intl.Collator with the user's locale ensures CJK account names sort
  // in dictionary order rather than Unicode code-point order.
  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base' }), [locale]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Compile calculations (Memoized using aggregated transaction sums instead of thousands of transaction rows)
  //
  // Sign convention:
  //   - LIABILITY startingBalance is stored as negative (the amount you owe).
  //   - Transaction amounts on liabilities: negative = spending (more debt),
  //     positive = payments (less debt).
  //   - The `balance` field below is always a positive magnitude:
  //       Asset:  how much money you hold (may be negative if overdrawn)
  //       Liability: the outstanding amount you owe
  //
  const bs = useMemo(() => {
    const accountBalances = accounts.map((account) => {
      const netChange = transactionSums[account.id] || 0;
      const rawBalance = account.startingBalance + netChange;
      // For liabilities: rawBalance is negative (debt), so -rawBalance
      // converts it to a positive outstanding amount.
      const balance = account.type === 'LIABILITY' ? -rawBalance : rawBalance;
      return {
        ...account,
        balance,
      };
    });

    const totals: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number }> = {};
    for (const account of accountBalances) {
      const currency = account.currency || DEFAULT_CURRENCY;
      if (!totals[currency]) {
        totals[currency] = { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
      }
      if (account.type === 'ASSET') {
        totals[currency].totalAssets += account.balance;
      } else if (account.type === 'LIABILITY') {
        // account.balance is a positive magnitude (amount owed)
        totals[currency].totalLiabilities += account.balance;
      }
    }
    for (const currency of Object.keys(totals)) {
      // Both totals are positive, so net worth = assets - liabilities
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
      const sign = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'name') {
        // WHY: Pass locale to collator so Chinese account names sort in
        // dictionary order rather than Unicode code-point order.
        return sign * collator.compare(a.name, b.name);
      } else if (sortField === 'type') {
        if (a.type < b.type) return sortDirection === 'asc' ? -1 : 1;
        if (a.type > b.type) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      } else if (sortField === 'balance') {
        const valA = bs.accounts.find((x) => x.id === a.id)?.balance ?? a.startingBalance;
        const valB = bs.accounts.find((x) => x.id === b.id)?.balance ?? b.startingBalance;
        return sign * (valA - valB);
      } else if (sortField === 'transactions') {
        const valA = a._count?.transactions || 0;
        const valB = b._count?.transactions || 0;
        return sign * (valA - valB);
      }
      return 0;
    });
    return sorted;
  }, [filteredAccounts, sortField, sortDirection, bs.accounts, collator]);

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
        setNewAccCurrency(preferredCurrency);
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

  // WHY: Using a ref for isEditDirty avoids re-registering the keydown
  // listener on every keystroke (isEditDirty recalculates via useMemo
  // whenever the edit form fields change).
  const isEditDirtyRef = useRef(isEditDirty);
  isEditDirtyRef.current = isEditDirty;

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check discard confirm first since it stacks above the edit modal
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (editingAccount) {
          if (isEditDirtyRef.current) {
            setShowDiscardConfirm(true);
          } else {
            setEditingAccount(null);
          }
        } else if (accountToDelete) {
          setAccountToDelete(null);
        }
      }
    };
    if (editingAccount || accountToDelete || showDiscardConfirm) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [editingAccount, accountToDelete, showDiscardConfirm]);

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
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base-content/40 z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <Input
                      type="text"
                      placeholder={tCommon('search') || 'Search accounts...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-sm w-full pl-9 bg-base-200/50 focus:bg-base-100 transition-colors text-base-content font-normal text-xs"
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
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSort('name')}
                          className="font-bold w-full justify-start"
                          aria-label="Sort by account name"
                        >
                          {t('accountName')} <SortIndicator field="name" />
                        </Button>
                      </th>
                      <th>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSort('type')}
                          className="font-bold w-full justify-start"
                          aria-label="Sort by account type"
                        >
                          {t('type')} <SortIndicator field="type" />
                        </Button>
                      </th>
                      <th className="text-center">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSort('transactions')}
                          className="font-bold w-full justify-center"
                          aria-label="Sort by transaction count"
                        >
                          {t('transactionsCountHeader')} <SortIndicator field="transactions" />
                        </Button>
                      </th>
                      <th className="text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSort('balance')}
                          className="font-bold w-full justify-end"
                          aria-label="Sort by account balance"
                        >
                          {t('balance')} <SortIndicator field="balance" />
                        </Button>
                      </th>
                      <th className="text-center">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((acc) => {
                      const calculatedBalance = bs.accounts.find((a) => a.id === acc.id)?.balance;
                      // calculatedBalance is a positive magnitude for both types:
                      //   Asset:  how much money you hold (may be negative if overdrawn)
                      //   Liability: the outstanding amount you owe (always positive)
                      const displayBalance = calculatedBalance ?? acc.startingBalance;
                      const isDebt = acc.type === 'LIABILITY';
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
                              {acc.type === 'ASSET' ? t('accountTypeAsset') : t('accountTypeLiability')}
                            </span>
                          </td>
                          <td className="text-center font-semibold text-sm">
                            <div>{acc._count?.transactions || 0}</div>
                            <div className="text-[10px] text-base-content/40 font-normal mt-0.5">
                              {lastTxDates[acc.id] != null
                                ? t('lastActivity', { date: formatDate(lastTxDates[acc.id]!) })
                                : t('noActivity')}
                            </div>
                          </td>
                          <td className={`text-right font-mono font-bold ${isDebt ? 'text-error' : (displayBalance >= 0 ? 'text-success' : 'text-error')}`}>
                            {isDebt ? '' : (displayBalance < 0 ? '-' : '')}{symbol}{Math.abs(displayBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(acc)}
                                className="text-info hover:bg-info/10"
                                disabled={isPending}
                                aria-label={`Edit ${acc.name}`}
                              >
                                {tCommon('edit')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(acc)}
                                className="text-error hover:bg-error/10"
                                loading={isDeleting}
                                disabled={isPending}
                                aria-label={`Delete ${acc.name}`}
                              >
                                {tCommon('delete')}
                              </Button>
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
              <Input
                id="new-account-name"
                label={t('newAccountName')}
                type="text"
                placeholder={t('newAccountNamePlaceholder')}
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                required
                disabled={isCreating}
              />

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
                {mounted && (
                  <CurrencySelector
                    id="new-account-currency"
                    value={newAccCurrency}
                    onChange={setNewAccCurrency}
                    disabled={isCreating}
                    className="w-full"
                  />
                )}
              </div>

              <Input
                id="new-account-balance"
                label={`${t('newAccountBalance')} (${getCurrencySymbol(newAccCurrency)})`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccBalance}
                onChange={(e) => setNewAccBalance(e.target.value)}
                disabled={isCreating}
                helperText={t('balanceHelp')}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                loading={isCreating}
                disabled={!newAccName}
              >
                {t('addAccount')}
              </Button>
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
              <Input
                id="edit-account-name"
                label={t('newAccountName')}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={isUpdating}
              />

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
                {mounted && (
                  <CurrencySelector
                    id="edit-account-currency"
                    value={editCurrency}
                    onChange={setEditCurrency}
                    disabled={isUpdating}
                    className="w-full"
                  />
                )}
              </div>

              <Input
                id="edit-account-balance"
                label={`${t('newAccountBalance')} (${getCurrencySymbol(editCurrency)})`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                disabled={isUpdating}
                helperText={t('balanceHelp')}
              />

              <div className="modal-action">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="submit"
                  loading={isUpdating}
                  disabled={!editName.trim()}
                >
                  {t('saveChanges')}
                </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAccountToDelete(null)}
                disabled={deletingAccountId !== null}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="error"
                size="sm"
                onClick={handleDeleteConfirm}
                loading={deletingAccountId !== null}
              >
                {t('deleteAccountBtn')}
              </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardCancel}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDiscardConfirm}
              >
                {tCommon('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Notification Container */}
      <ToastContainer
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
