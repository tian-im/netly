'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Settings, Check, AlertTriangle } from 'lucide-react';
import { Account, Category } from '../types';

interface FilterBarProps {
  accounts: Account[];
  categories: Category[];
  selectedAccountId: string;
  selectedCategoryId: string;
  searchTerm: string;
  pageSize: number;
  ruleMode: 'ask' | 'always' | 'never';
  onFilterChange: (updates: {
    accountId?: string;
    categoryId?: string;
    searchTerm?: string;
    pageSize?: number;
  }) => void;
  onRuleModeChange: (mode: 'ask' | 'always' | 'never') => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function FilterBar({
  accounts,
  categories,
  selectedAccountId,
  selectedCategoryId,
  searchTerm,
  pageSize,
  ruleMode,
  onFilterChange,
  onRuleModeChange,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local search state with external search term
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ searchTerm: val });
    }, 300);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body p-4 flex flex-col lg:flex-row gap-3 items-center">
        {/* Account filter */}
        <div className="w-full lg:w-48">
          <select
            value={selectedAccountId}
            onChange={(e) => onFilterChange({ accountId: e.target.value })}
            className="select select-bordered select-sm w-full"
            aria-label="Filter transactions by account"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div className="w-full lg:w-52">
          <select
            value={selectedCategoryId}
            onChange={(e) => onFilterChange({ categoryId: e.target.value })}
            className="select select-bordered select-sm w-full"
            aria-label="Filter transactions by category"
          >
            <option value="">All Categories</option>
            <option value="UNCATEGORIZED">⚠ Uncategorized only</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-base-content/40">
            <Search className="w-4 h-4" aria-hidden="true" />
          </span>
          <input
            type="text"
            placeholder="Search payee or memo..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full pl-9"
            aria-label="Search payee or memo"
          />
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-between lg:justify-start border-t lg:border-t-0 pt-3 lg:pt-0 mt-2 lg:mt-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50 whitespace-nowrap">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onFilterChange({ pageSize: Number(e.target.value) })}
              className="select select-bordered select-sm w-20"
              aria-label="Transactions per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Rule settings popover */}
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Rule creation settings"
            >
              <Settings className="w-4 h-4 text-base-content/65" />
            </button>
            <div
              tabIndex={0}
              className="dropdown-content card card-compact bg-base-100 z-10 w-64 p-2 shadow-xl border border-base-200"
            >
              <div className="card-body">
                <h3 className="font-bold text-xs uppercase tracking-wider text-primary mb-1">
                  Rule Prompt Preferences
                </h3>
                <p className="text-[11px] text-base-content/60 mb-2">
                  Choose default action when manually categorizing transactions:
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onRuleModeChange('ask')}
                    className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                      ruleMode === 'ask' ? 'font-semibold text-primary' : ''
                    }`}
                  >
                    <span>Ask to create rules</span>
                    {ruleMode === 'ask' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRuleModeChange('always')}
                    className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                      ruleMode === 'always' ? 'font-semibold text-primary' : ''
                    }`}
                  >
                    <span>Automatically create rules</span>
                    {ruleMode === 'always' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRuleModeChange('never')}
                    className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                      ruleMode === 'never' ? 'font-semibold text-primary' : ''
                    }`}
                  >
                    <span>Never create rules</span>
                    {ruleMode === 'never' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
