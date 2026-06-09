'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { getTransactions, getAccounts, getCategories, updateTransactionCategory } from '../actions';
import { translateError } from '@/lib/translateError';
import { Account, Category, Transaction, SortConfig } from './types';
import FilterBar from './components/FilterBar';
import TransactionTable from './components/TransactionTable';
import Pagination from './components/Pagination';
import RulePromptModal from './components/RulePromptModal';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import BulkActionPanel from './components/BulkActionPanel';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  initialAccounts: Account[];
  initialCategories: Category[];
}

export default function TransactionsClient({
  initialTransactions,
  initialAccounts,
  initialCategories,
}: TransactionsClientProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Unified query parameters to avoid double-fetching
  const [query, setQuery] = useState({
    accountId: '',
    categoryId: '',
    searchTerm: '',
    page: 1,
    pageSize: 25,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected transaction detail view drawer state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Preference for auto-creating rules: 'ask' | 'always' | 'never'
  const [ruleMode, setRuleMode] = useState<'ask' | 'always' | 'never'>('ask');

  // Manual rule creation modal states
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [promptTx, setPromptTx] = useState<Transaction | null>(null);
  const [promptCatId, setPromptCatId] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const result = await getTransactions({
        accountId: query.accountId || undefined,
        categoryId: query.categoryId || undefined,
        searchTerm: query.searchTerm || undefined,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
      });
      setTransactions(result.transactions);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      showToast(tErr(translateError(err)), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Read localStorage preferences
    const saved = localStorage.getItem('netly_rule_mode');
    if (saved === 'always' || saved === 'never' || saved === 'ask') {
      setRuleMode(saved);
    }
  }, []);

  // Fetch transactions exactly once when any query parameter or sorting changes
  useEffect(() => {
    fetchTransactions();
  }, [
    query.accountId,
    query.categoryId,
    query.searchTerm,
    query.page,
    query.pageSize,
    sortConfig.sortBy,
    sortConfig.sortOrder,
  ]);

  const handleFilterChange = (updates: Partial<typeof query>) => {
    setQuery((prev) => {
      const newQuery = { ...prev, ...updates };
      // Always reset page to 1 when a filter criteria (other than page itself) changes
      if (!updates.hasOwnProperty('page')) {
        newQuery.page = 1;
      }
      return newQuery;
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
    setSortConfig((prev) => {
      if (prev.sortBy === field) {
        return {
          sortBy: field,
          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        sortBy: field,
        sortOrder: 'asc',
      };
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
          await updateTransactionCategory(tx.id, null);
          showToast(t('markedUncategorized'));
          // Sync detail view drawer if open
          if (selectedTx?.id === tx.id) {
            setSelectedTx((prev) => (prev ? { ...prev, categoryId: null, category: null, isReviewed: false } : null));
          }
          await fetchTransactions();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        }
      });
      return;
    }

    if (ruleMode === 'always') {
      startTransition(async () => {
        try {
          const updated = await updateTransactionCategory(tx.id, catId, true);
          showToast(t('assignedRule'));
          if (selectedTx?.id === tx.id) {
            setSelectedTx(updated);
          }
          await fetchTransactions();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        }
      });
    } else if (ruleMode === 'never') {
      startTransition(async () => {
        try {
          const updated = await updateTransactionCategory(tx.id, catId, false);
          showToast(t('assignedCategory'));
          if (selectedTx?.id === tx.id) {
            setSelectedTx(updated);
          }
          await fetchTransactions();
        } catch (err: any) {
          showToast(tErr(translateError(err)), 'error');
        }
      });
    } else {
      // ruleMode === 'ask'
      setPromptTx(tx);
      setPromptCatId(catId);
      setShowRulePrompt(true);
    }
  };

  const executeCategorization = async (createRule: boolean) => {
    if (!promptTx) return;
    startTransition(async () => {
      try {
        const updated = await updateTransactionCategory(promptTx.id, promptCatId, createRule);
        showToast(
          createRule
            ? t('detail.ruleCreateSuccess', { pattern: promptTx.payee, category: categories.find(c => c.id === promptCatId)?.name || '' })
            : t('detail.updateSuccess')
        );
        setShowRulePrompt(false);
        setPromptTx(null);
        if (selectedTx?.id === promptTx.id) {
          setSelectedTx(updated);
        }
        await fetchTransactions();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      }
    });
  };

  // Bulk actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allOnPageIds = transactions.map((t) => t.id);
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
        await Promise.all(
          selectedIds.map((id) => updateTransactionCategory(id, targetCatId, false))
        );
        showToast(t('bulkApplySuccess', { count: selectedIds.length }));
        setSelectedIds([]);
        // Sync drawer if open and was modified
        if (selectedTx && selectedIds.includes(selectedTx.id)) {
          const matchedCategory = categories.find((c) => c.id === targetCatId);
          setSelectedTx((prev) =>
            prev
              ? {
                  ...prev,
                  categoryId: targetCatId,
                  category: matchedCategory || null,
                  isReviewed: targetCatId !== null,
                }
              : null
          );
        }
        await fetchTransactions();
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      }
    });
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
        {/* Total count badge */}
        <div className="shrink-0">
          <span className="badge badge-neutral badge-lg font-mono font-bold py-3">
            {t('transactionsCount', { count: totalCount })}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <FilterBar
        accounts={accounts}
        categories={categories}
        selectedAccountId={query.accountId}
        selectedCategoryId={query.categoryId}
        searchTerm={query.searchTerm}
        pageSize={query.pageSize}
        ruleMode={ruleMode}
        onFilterChange={handleFilterChange}
        onRuleModeChange={handleRuleModeChange}
      />

      {/* Ledger Table */}
      <TransactionTable
        transactions={transactions}
        categories={categories}
        isLoading={isLoading}
        selectedIds={selectedIds}
        sortConfig={sortConfig}
        onSort={handleSort}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onCategoryChange={handleCategoryChange}
        onRowClick={setSelectedTx}
      />

      {/* Pagination */}
      <Pagination
        totalCount={totalCount}
        pageSize={query.pageSize}
        currentPage={query.page}
        onPageChange={(page) => handleFilterChange({ page })}
      />

      {/* Automation Rule Prompt Modal */}
      <RulePromptModal
        isOpen={showRulePrompt}
        transaction={promptTx}
        categoryId={promptCatId}
        categories={categories}
        isPending={isPending}
        onConfirm={executeCategorization}
      />

      {/* Transaction Detail View Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTx}
        categories={categories}
        isPending={isPending}
        onClose={() => setSelectedTx(null)}
        onCategoryChange={handleCategoryChange}
      />

      {/* Bulk Action floating controls */}
      <BulkActionPanel
        selectedCount={selectedIds.length}
        categories={categories}
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
