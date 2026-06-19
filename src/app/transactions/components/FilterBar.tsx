'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Settings, Check } from 'lucide-react';
import { Account, Category } from '../types';
import { translateCategoryType } from '@/lib/translate-category';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import { Button, Input, Checkbox } from '@/app/components/ui';

interface FilterBarProps {
  accounts: Account[];
  categories: Category[];
  selectedAccountId: string;
  selectedCategoryId: string;
  selectedCurrency: string;
  searchTerm: string;
  pageSize: number;
  dateRange: string;
  isReviewed: string;
  duplicates?: boolean;
  ruleMode: 'ask' | 'always' | 'never';
  onFilterChange: (updates: {
    accountId?: string;
    categoryId?: string;
    currency?: string;
    searchTerm?: string;
    pageSize?: number;
    dateRange?: string;
    isReviewed?: string;
    duplicates?: boolean;
  }) => void;
  onRuleModeChange: (mode: 'ask' | 'always' | 'never') => void;
  preferredCurrency?: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function FilterBar({
  accounts,
  categories,
  selectedAccountId,
  selectedCategoryId,
  selectedCurrency,
  searchTerm,
  pageSize,
  dateRange,
  isReviewed,
  duplicates = false,
  ruleMode,
  onFilterChange,
  onRuleModeChange,
  preferredCurrency = DEFAULT_CURRENCY,
}: FilterBarProps) {
  const t = useTranslations('transactions');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive unique currencies from the accounts list
  const uniqueCurrencies = useMemo(() => {
    const fromAccounts = Array.from(new Set(accounts.map((a) => a.currency).filter(Boolean))).sort();
    if (fromAccounts.length === 0) {
      return [preferredCurrency];
    }
    return fromAccounts;
  }, [accounts, preferredCurrency]);

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local search state with external search term & clear pending debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ searchTerm: val });
    }, 500);
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
      <div className="card-body p-4 flex flex-col gap-4">
        {/* Row 1: Search + Page size / Settings */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between w-full">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-2.5 text-base-content/40 z-10">
              <Search className="w-4 h-4" aria-hidden="true" />
            </span>
            <Input
              type="text"
              placeholder={t('filter.searchPlaceholder')}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-sm w-full pl-9"
              aria-label="Search payee or memo"
            />
          </div>

          {/* Page size & settings dropdown */}
          <div className="flex items-center gap-2 shrink-0 justify-end w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0">
            <span className="text-xs text-base-content/50 whitespace-nowrap">{t('filterBar.show')}</span>
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

            {/* Rule settings popover */}
            <div className="dropdown dropdown-end">
              <Button
                tabIndex={0}
                variant="ghost"
                size="sm"
                className="btn-circle"
                aria-label="Rule creation settings"
                icon={<Settings className="w-4 h-4 text-base-content/65" />}
              />
              <div
                tabIndex={0}
                className="dropdown-content card card-compact bg-base-100 z-10 w-64 p-2 shadow-xl border border-base-200"
              >
                <div className="card-body">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary mb-1">
                    {t('rulePrompt.rulePromptPrefs')}
                  </h3>
                  <p className="text-[11px] text-base-content/60 mb-2">
                    {t('rulePrompt.rulePromptPrefsDesc')}
                  </p>
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onRuleModeChange('ask')}
                      className={`w-full justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                        ruleMode === 'ask' ? 'font-semibold text-primary' : ''
                      }`}
                    >
                      <span>{t('rulePrompt.rulePromptAsk')}</span>
                      {ruleMode === 'ask' && <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onRuleModeChange('always')}
                      className={`w-full justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                        ruleMode === 'always' ? 'font-semibold text-primary' : ''
                      }`}
                    >
                      <span>{t('rulePrompt.rulePromptAlways')}</span>
                      {ruleMode === 'always' && <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onRuleModeChange('never')}
                      className={`w-full justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-base-200 transition-colors ${
                        ruleMode === 'never' ? 'font-semibold text-primary' : ''
                      }`}
                    >
                      <span>{t('rulePrompt.rulePromptNever')}</span>
                      {ruleMode === 'never' && <Check className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Select Filters (Grid format) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 w-full border-t border-base-200/50 pt-3">
          {/* Account filter */}
          <div className="w-full">
            <select
              value={selectedAccountId}
              onChange={(e) => onFilterChange({ accountId: e.target.value })}
              className="select select-bordered select-sm w-full"
              aria-label="Filter transactions by account"
            >
              <option value="">{t('filter.allAccounts')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Currency filter */}
          <div className="w-full">
            <select
              value={selectedCurrency}
              onChange={(e) => onFilterChange({ currency: e.target.value })}
              className="select select-bordered select-sm w-full"
              aria-label="Filter transactions by currency"
            >
              <option value="">{t('filter.allCurrencies')}</option>
              {uniqueCurrencies.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="w-full">
            <select
              value={selectedCategoryId}
              onChange={(e) => onFilterChange({ categoryId: e.target.value })}
              className="select select-bordered select-sm w-full"
              aria-label="Filter transactions by category"
            >
              <option value="">{t('filter.allCategories')}</option>
              <option value="UNCATEGORIZED">{t('filter.uncategorizedOnly')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({translateCategoryType(t, c.type)})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range filter */}
          <div className="w-full">
            <select
              value={dateRange || 'all'}
              onChange={(e) => onFilterChange({ dateRange: e.target.value })}
              className="select select-bordered select-sm w-full"
              aria-label="Filter transactions by date range"
            >
              <option value="all">{t('filter.allPeriods')}</option>
              <option value="month">{t('filter.month')}</option>
              <option value="threeMonths">{t('filter.threeMonths')}</option>
              <option value="sixMonths">{t('filter.sixMonths')}</option>
              <option value="twelveMonths">{t('filter.twelveMonths')}</option>
              <option value="ytd">{t('filter.ytd')}</option>
            </select>
          </div>

          {/* Review Status filter */}
          <div className="w-full">
            <select
              value={isReviewed}
              onChange={(e) => onFilterChange({ isReviewed: e.target.value })}
              className="select select-bordered select-sm w-full"
              aria-label="Filter transactions by review status"
            >
              <option value="all">{t('filter.allStatus')}</option>
              <option value="true">{t('filter.reviewed')}</option>
              <option value="false">{t('filter.needsReview')}</option>
            </select>
          </div>

          {/* Show duplicates toggle */}
          <div className="w-full flex items-center justify-start gap-2 h-full py-1">
            <label className="label cursor-pointer justify-start gap-2 w-full py-0">
              <Checkbox
                id="show-duplicates-toggle"
                variant="toggle"
                size="sm"
                checked={duplicates}
                onChange={(e) => onFilterChange({ duplicates: e.target.checked })}
                aria-label="Show duplicate transactions only"
              />
              <span className="label-text text-xs font-semibold whitespace-nowrap">{t('showDuplicates')}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
