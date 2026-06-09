'use client';

import { useState, useEffect, useTransition } from 'react';
import { getTransactions, getAccounts, getCategories, updateTransactionCategory } from '../actions';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filter states
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Prompt states for creating global rules on manual categorization
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [promptTx, setPromptTx] = useState<any | null>(null);
  const [promptCatId, setPromptCatId] = useState('');

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const accs = await getAccounts();
    const cats = await getCategories();
    setAccounts(accs);
    setCategories(cats);
  };

  const fetchTransactions = async () => {
    try {
      const result = await getTransactions({
        accountId: selectedAccountId || undefined,
        categoryId: selectedCategoryFilter || undefined,
        searchTerm: searchTerm || undefined,
        page: currentPage,
        pageSize,
      });
      setTransactions(result.transactions);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedAccountId, selectedCategoryFilter, searchTerm, currentPage, pageSize]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccountId, selectedCategoryFilter, searchTerm, pageSize]);

  const handleCategoryChange = async (tx: any, catId: string) => {
    if (!catId) {
      startTransition(async () => {
        await updateTransactionCategory(tx.id, null);
        await fetchTransactions();
      });
      return;
    }
    setPromptTx(tx);
    setPromptCatId(catId);
    setShowRulePrompt(true);
  };

  const executeCategorization = async (createRule: boolean) => {
    if (!promptTx) return;
    startTransition(async () => {
      try {
        await updateTransactionCategory(promptTx.id, promptCatId, createRule);
        setShowRulePrompt(false);
        setPromptTx(null);
        await fetchTransactions();
      } catch (err: any) {
        alert(err.message || 'Failed to update transaction');
      }
    });
  };

  // Pagination computation
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = totalCount === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + transactions.length, totalCount);
  const pageTxs = transactions;

  // Build visible page numbers (up to 7, with ellipsis logic)
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
            Transaction Ledger
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Review transactions, categorize them, and define match rules to automate future statements.
          </p>
        </div>
        {/* Total count badge */}
        <div className="shrink-0">
          <span className="badge badge-ghost badge-lg font-mono font-bold">
            {totalCount.toLocaleString()} transaction{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-4 flex flex-col md:flex-row gap-3 items-center">
          {/* Account filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="select select-bordered select-sm w-full md:w-48"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="select select-bordered select-sm w-full md:w-52"
          >
            <option value="">All Categories</option>
            <option value="UNCATEGORIZED">⚠️ Uncategorized only</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-2.5 text-base-content/40">🔍</span>
            <input
              type="text"
              placeholder="Search payee or memo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-base-content/50 whitespace-nowrap">Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="select select-bordered select-sm w-20"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <table className="table w-full">
          <thead>
            <tr className="border-b border-base-200">
              <th className="w-24">Date</th>
              <th className="w-32">Account</th>
              <th>Payee / Memo</th>
              <th className="w-44">Category</th>
              <th className="text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pageTxs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-base-content/40">
                  {transactions.length === 0 ? (
                    <span>No transactions imported yet.</span>
                  ) : (
                    <span>No transactions match the selected filters.</span>
                  )}
                </td>
              </tr>
            ) : (
              pageTxs.map((tx) => (
                <tr
                  key={tx.id}
                  className={`hover:bg-base-200/50 border-b border-base-200 ${!tx.isReviewed ? 'bg-warning/5 border-l-4 border-l-warning' : ''}`}
                >
                  {/* Date */}
                  <td className="font-mono text-xs align-top pt-3">
                    {new Date(tx.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </td>

                  {/* Account */}
                  <td className="text-xs font-semibold align-top pt-3 break-words">
                    {tx.account.name}
                  </td>

                  {/* Payee + description */}
                  <td className="align-top pt-3">
                    <div className="font-bold text-sm break-words">{tx.payee}</div>
                    {tx.description && (
                      <div className="text-xs text-base-content/45 break-words mt-0.5">
                        {tx.description}
                      </div>
                    )}
                  </td>

                  {/* Category select */}
                  <td className="align-top pt-2">
                    <select
                      value={tx.categoryId || ''}
                      onChange={(e) => handleCategoryChange(tx, e.target.value)}
                      className={`select select-bordered select-xs w-full font-semibold ${!tx.categoryId ? 'select-warning text-warning-content' : ''}`}
                      disabled={isPending}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Amount */}
                  <td className={`text-right font-mono font-bold align-top pt-3 ${tx.amount >= 0 ? 'text-success' : 'text-error'}`}>
                    {tx.amount >= 0 ? '+' : ''}
                    ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-normal opacity-60">{tx.account.currency}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-base-200 bg-base-100">
            {/* Result range info */}
            <p className="text-xs text-base-content/50">
              Showing <span className="font-semibold text-base-content">{startIdx + 1}–{endIdx}</span> of{' '}
              <span className="font-semibold text-base-content">{totalCount.toLocaleString()}</span> transactions
            </p>

            {/* Page controls */}
            <div className="join">
              {/* First page */}
              <button
                className="join-item btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                title="First page"
              >
                «
              </button>

              {/* Prev */}
              <button
                className="join-item btn btn-sm btn-ghost"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                title="Previous page"
              >
                ‹
              </button>

              {/* Numbered pages */}
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <button key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled">
                    …
                  </button>
                ) : (
                  <button
                    key={p}
                    className={`join-item btn btn-sm ${safePage === p ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                className="join-item btn btn-sm btn-ghost"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                title="Next page"
              >
                ›
              </button>

              {/* Last page */}
              <button
                className="join-item btn btn-sm btn-ghost"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                title="Last page"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Categorization Rule Modal Prompt */}
      {showRulePrompt && promptTx && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-black text-lg text-primary">Create Automation Rule?</h3>
            <p className="py-4 text-sm">
              You mapped <span className="font-bold">"{promptTx.payee}"</span> to category{' '}
              <span className="font-bold">"{categories.find((c) => c.id === promptCatId)?.name}"</span>.
              Would you like to automatically categorize all future transactions matching this merchant?
            </p>
            <div className="modal-action">
              <button
                onClick={() => executeCategorization(false)}
                className="btn btn-outline"
                disabled={isPending}
              >
                No, just this one
              </button>
              <button
                onClick={() => executeCategorization(true)}
                className="btn btn-primary"
                disabled={isPending}
              >
                Yes, save rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
