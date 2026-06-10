'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { updateTransactionCategory, bulkUpdateTransactionsCategory, exportAllTransactions } from '../actions';
import { translateError } from '@/lib/translateError';
import { generateLedgerCSV, downloadCSV } from '@/lib/csv-export';
import { Account, Category, Transaction, SortConfig } from './types';
import FilterBar from './components/FilterBar';
import TransactionTable from './components/TransactionTable';
import RulePromptModal from './components/RulePromptModal';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import BulkActionPanel from './components/BulkActionPanel';
import { Upload } from 'lucide-react';

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
}

export default function TransactionsClient({
  initialTransactions,
  initialTotalCount,
  initialAccounts,
  initialCategories,
}: TransactionsClientProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  const tSettings = useTranslations('settings');

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

  const [isPending, startTransition] = useTransition();

  // Read URL search params
  const accountId = searchParams.get('accountId') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const searchTerm = searchParams.get('searchTerm') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(searchParams.get('pageSize')) || 25);
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const dateRange = searchParams.get('dateRange') || '';
  const isReviewed = searchParams.get('isReviewed') || 'all';

  const query = {
    accountId,
    categoryId,
    searchTerm,
    page,
    pageSize,
    dateRange,
    isReviewed,
  };

  const sortConfig: SortConfig = {
    sortBy,
    sortOrder,
  };

  // Find currently selected transaction in newly fetched list to keep details updated
  const activeTx = selectedTx ? (initialTransactions.find(t => t.id === selectedTx.id) || selectedTx) : null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutIdsRef.current = timeoutIdsRef.current.filter(t => t !== timer);
    }, 4000);
    timeoutIdsRef.current.push(timer);
  };

  // Initial load preferences
  useEffect(() => {
    const saved = localStorage.getItem('netly_rule_mode');
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
        if (val === undefined || val === '') {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      // Always reset page to 1 when a filter criteria (other than page itself) changes
      if (!updates.hasOwnProperty('page')) {
        params.set('page', '1');
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleRuleModeChange = (mode: 'ask' | 'always' | 'never') => {
    setRuleMode(mode);
    localStorage.setItem('netly_rule_mode', mode);
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
    const allOnPageIds = initialTransactions.map((t) => t.id);
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

  const handleExportCSV = async () => {
    try {
      const txs = await exportAllTransactions();
      if (txs.length === 0) {
        showToast(tCommon('noResults'), 'error');
        return;
      }
      const csvContent = generateLedgerCSV(txs as any);
      downloadCSV(csvContent, `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      showToast(tSettings('exportSuccess'));
    } catch (err: any) {
      showToast(tSettings('exportFailed'), 'error');
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
            <Upload className="h-4 w-4" />
            <span>{t('exportCsv')}</span>
          </button>
          <span className="badge badge-neutral badge-lg font-mono font-bold py-3">
            {t('transactionsCount', { count: initialTotalCount })}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <FilterBar
        accounts={initialAccounts}
        categories={initialCategories}
        selectedAccountId={query.accountId}
        selectedCategoryId={query.categoryId}
        searchTerm={query.searchTerm}
        pageSize={query.pageSize}
        dateRange={query.dateRange}
        isReviewed={query.isReviewed}
        ruleMode={ruleMode}
        onFilterChange={handleFilterChange}
        onRuleModeChange={handleRuleModeChange}
      />

      {/* Ledger Table */}
      <TransactionTable
        transactions={initialTransactions}
        totalCount={initialTotalCount}
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
