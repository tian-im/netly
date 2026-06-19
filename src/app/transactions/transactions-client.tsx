'use client';

import { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { updateTransactionCategory, bulkUpdateTransactionsCategory, exportAllTransactions, bulkDeleteTransactions } from '../actions';
import { translateError } from '@/lib/translateError';
import { generateLedgerCSV, downloadCSV } from '@/lib/csv-export';
import { PREFERENCES, getPreference, setPreference } from '@/lib/preferences';
import { Account, Category, Transaction, SortConfig } from './types';
import FilterBar from './components/FilterBar';
import TransactionTable from './components/TransactionTable';
import RulePromptModal from './components/RulePromptModal';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import BulkActionPanel from './components/BulkActionPanel';
import { Download } from 'lucide-react';
import type { DuplicateGroup } from '@/lib/duplicates';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  initialTotalCount: number;
  initialAccounts: Account[];
  initialCategories: Category[];
  preferredCurrency?: string;
  initialDuplicateGroups?: DuplicateGroup[];
}

export default function TransactionsClient({
  initialTransactions,
  initialTotalCount,
  initialAccounts,
  initialCategories,
  preferredCurrency,
  initialDuplicateGroups = [],
}: TransactionsClientProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Preference for auto-creating rules: 'ask' | 'always' | 'never'
  const [ruleMode, setRuleMode] = useState<'ask' | 'always' | 'never'>('ask');

  // Manual rule creation modal states
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [promptTx, setPromptTx] = useState<Transaction | null>(null);
  const [promptCatId, setPromptCatId] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected transaction detail view drawer state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Per-row updating status
  const [updatingTxId, setUpdatingTxId] = useState<string | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  // State for dismissed duplicate groups (session-only)
  const [dismissedGroupKeys, setDismissedGroupKeys] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  // Read URL search params
  const accountId = searchParams.get('accountId') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const searchTerm = searchParams.get('searchTerm') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(searchParams.get('pageSize')) || 25);
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const dateRange = searchParams.get('dateRange') || 'all';
  const isReviewed = searchParams.get('isReviewed') || 'all';
  const currency = searchParams.get('currency') || '';
  const duplicates = searchParams.get('duplicates') === 'true';

  // Compute active duplicate groups and displayed transactions
  const activeDuplicateGroups = useMemo(() => {
    if (!duplicates) return [];
    return initialDuplicateGroups.filter((g) => !dismissedGroupKeys.includes(g.id));
  }, [initialDuplicateGroups, dismissedGroupKeys, duplicates]);

  const displayedTransactions = useMemo(() => {
    if (duplicates) {
      return activeDuplicateGroups.flatMap((g) => g.transactions);
    }
    return initialTransactions;
  }, [initialTransactions, activeDuplicateGroups, duplicates]);

  const displayedTotalCount = useMemo(() => {
    if (duplicates) {
      return displayedTransactions.length;
    }
    return initialTotalCount;
  }, [initialTotalCount, displayedTransactions, duplicates]);

  const query = {
    accountId,
    categoryId,
    searchTerm,
    page,
    pageSize,
    dateRange,
    isReviewed,
    currency,
    duplicates,
  };

  const sortConfig: SortConfig = {
    sortBy,
    sortOrder,
  };

  // Find currently selected transaction in newly fetched list to keep details updated
  const activeTx = selectedTx ? (displayedTransactions.find(t => t.id === selectedTx.id) || selectedTx) : null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutIdsRef.current = timeoutIdsRef.current.filter(t => t !== timer);
    }, 4000);
    timeoutIdsRef.current.push(timer);
  };

  // WHY: Use the unified getPreference instead of raw localStorage.getItem.
  // This follows the cookie-first hierarchy and keeps the cookie key in one place.
  useEffect(() => {
    const saved = getPreference(PREFERENCES.ruleMode);
    if (saved === 'always' || saved === 'never' || saved === 'ask') {
      setRuleMode(saved);
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleFilterChange = (updates: Partial<typeof query>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === '' || val === false) {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      // Always reset page to 1 when a filter criteria (other than page itself) changes
      if (!Object.hasOwn(updates, 'page')) {
        params.set('page', '1');
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleRuleModeChange = (mode: 'ask' | 'always' | 'never') => {
    setRuleMode(mode);
    // WHY: Using setPreference ensures dual-write to localStorage and cookie,
    // replacing the previous localStorage-only write.
    setPreference(PREFERENCES.ruleMode, mode);
    showToast(
      `${t('rulePrompt.rulePromptPrefs')}: ${
        mode === 'ask'
          ? t('rulePrompt.rulePromptAsk')
          : mode === 'always'
          ? t('rulePrompt.rulePromptAlways')
          : t('rulePrompt.rulePromptNever')
      }`
    );
  };

  const handleSort = (field: string) => {
    const newSortOrder = (sortBy === field && sortOrder === 'asc') ? 'desc' : 'asc';
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortBy', field);
      params.set('sortOrder', newSortOrder);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleCategoryChange = async (tx: Transaction, catId: string) => {
    if (!catId) {
      const confirmUncat = window.confirm(
        t('uncategorizeConfirm')
      );
      if (!confirmUncat) return;

      startTransition(async () => {
        try {
          setUpdatingTxId(tx.id);
          await updateTransactionCategory(tx.id, null);
          showToast(t('markedUncategorized'));
          router.refresh();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        } finally {
          setUpdatingTxId(null);
        }
      });
      return;
    }

    if (ruleMode === 'always') {
      startTransition(async () => {
        try {
          setUpdatingTxId(tx.id);
          await updateTransactionCategory(tx.id, catId, true);
          showToast(t('assignedRule'));
          router.refresh();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        } finally {
          setUpdatingTxId(null);
        }
      });
    } else if (ruleMode === 'never') {
      startTransition(async () => {
        try {
          setUpdatingTxId(tx.id);
          await updateTransactionCategory(tx.id, catId, false);
          showToast(t('assignedCategory'));
          router.refresh();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        } finally {
          setUpdatingTxId(null);
        }
      });
    } else {
      setPromptTx(tx);
      setPromptCatId(catId);
      setShowRulePrompt(true);
    }
  };

  const executeCategorization = async (createRule: boolean) => {
    if (!promptTx) return;
    startTransition(async () => {
      try {
        setUpdatingTxId(promptTx.id);
        await updateTransactionCategory(promptTx.id, promptCatId, createRule);
        showToast(
          createRule
            ? t('detail.ruleCreateSuccess', { pattern: promptTx.payee, category: initialCategories.find(c => c.id === promptCatId)?.name || '' })
            : t('detail.updateSuccess')
        );
        setShowRulePrompt(false);
        setPromptTx(null);
        router.refresh();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setUpdatingTxId(null);
      }
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allOnPageIds = displayedTransactions.map((t) => t.id);
    const areAllSelected = allOnPageIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allOnPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        allOnPageIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleBulkCategorize = async (catId: string) => {
    const isUncategorizing = catId === 'UNCATEGORIZED';
    const targetCatId = isUncategorizing ? null : catId;

    if (isUncategorizing) {
      const confirmUncat = window.confirm(
        t('bulkUncategorizeConfirm', { count: selectedIds.length })
      );
      if (!confirmUncat) return;
    }

    startTransition(async () => {
      try {
        await bulkUpdateTransactionsCategory(selectedIds, targetCatId);
        showToast(t('bulkApplySuccess', { count: selectedIds.length }));
        setSelectedIds([]);
        router.refresh();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      try {
        const res = await bulkDeleteTransactions(selectedIds);
        if (res.deletedCount === 0) {
          showToast(t('noTransactionsDeleted'), 'error');
        } else {
          showToast(t('bulkDeleteSuccess', { count: res.deletedCount }));
        }
        setSelectedIds([]);
        router.refresh();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      }
    });
  };

  const handleKeepOneDeleteRest = async (group: DuplicateGroup) => {
    const keepId = group.transactions[0].id;
    const deleteIds = group.transactions.slice(1).map((t) => t.id);

    startTransition(async () => {
      try {
        const res = await bulkDeleteTransactions(deleteIds);
        if (res.deletedCount === 0) {
          showToast(t('noTransactionsDeleted'), 'error');
        } else {
          showToast(t('bulkDeleteSuccess', { count: res.deletedCount }));
        }
        setDismissedGroupKeys((prev) => [...prev, group.id]);
        router.refresh();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      }
    });
  };

  const handleDismissDuplicateGroup = (groupId: string) => {
    setDismissedGroupKeys((prev) => [...prev, groupId]);
    showToast(t('duplicateGroupDismissed'));
  };

  const handleExportCSV = async () => {
    try {
      const txs = await exportAllTransactions();
      if (txs.length === 0) {
        showToast(tCommon('noResults'), 'error');
        return;
      }
      const csvContent = generateLedgerCSV(txs);
      downloadCSV(csvContent, `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: any) {
      showToast(t('exportFailed'), 'error');
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
            {t('pageTitle')}
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            {t('pageDesc')}
          </p>
        </div>
        
        {/* Actions header group */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={handleExportCSV}
            className="btn btn-outline btn-primary btn-sm gap-2"
          >
            <Download className="h-4 w-4" />
            <span>{t('exportCsv')}</span>
          </button>
          <span className="badge badge-neutral badge-lg font-mono font-bold py-3">
            {t('transactionsCount', { count: displayedTotalCount })}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <FilterBar
        accounts={initialAccounts}
        categories={initialCategories}
        selectedAccountId={query.accountId}
        selectedCategoryId={query.categoryId}
        selectedCurrency={query.currency}
        searchTerm={query.searchTerm}
        pageSize={query.pageSize}
        dateRange={query.dateRange}
        isReviewed={query.isReviewed}
        duplicates={query.duplicates}
        ruleMode={ruleMode}
        onFilterChange={handleFilterChange}
        onRuleModeChange={handleRuleModeChange}
        preferredCurrency={preferredCurrency}
      />

      {/* Ledger Table */}
      <TransactionTable
        transactions={displayedTransactions}
        totalCount={displayedTotalCount}
        currentPage={query.page}
        pageSize={query.pageSize}
        categories={initialCategories}
        isLoading={isPending}
        updatingTxId={updatingTxId}
        selectedIds={selectedIds}
        sortConfig={sortConfig}
        onSort={handleSort}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onCategoryChange={handleCategoryChange}
        onRowClick={setSelectedTx}
        onPageChange={(p) => handleFilterChange({ page: p })}
        isDuplicateView={duplicates}
        duplicateGroups={activeDuplicateGroups}
        onKeepOneDeleteRest={handleKeepOneDeleteRest}
        onDismissDuplicateGroup={handleDismissDuplicateGroup}
      />

      {/* Automation Rule Prompt Modal */}
      <RulePromptModal
        isOpen={showRulePrompt}
        transaction={promptTx}
        categoryId={promptCatId}
        categories={initialCategories}
        isPending={isPending}
        onConfirm={executeCategorization}
      />

      {/* Transaction Detail View Drawer */}
      <TransactionDetailDrawer
        transaction={activeTx}
        categories={initialCategories}
        isPending={isPending}
        onClose={() => setSelectedTx(null)}
        onCategoryChange={handleCategoryChange}
      />

      {/* Bulk Action floating controls */}
      <BulkActionPanel
        selectedCount={selectedIds.length}
        categories={initialCategories}
        isPending={isPending}
        onClearSelection={() => setSelectedIds([])}
        onBulkCategorize={handleBulkCategorize}
        onBulkDelete={handleBulkDelete}
      />

      {/* Toasts Notification Container */}
      <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert shadow-lg text-xs font-semibold ${
              t.type === 'error' ? 'alert-error text-error-content' : 'alert-success text-success-content'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
