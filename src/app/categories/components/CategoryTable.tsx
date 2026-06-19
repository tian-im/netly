'use client';

import { useTranslations } from 'next-intl';
import { Tags, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '@/app/components/ui';
import type { Category } from '../types';

interface CategoryTableProps {
  categories: Category[];
  sortedCategories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: 'name' | 'type' | 'cashFlowType' | 'usage' | 'rules';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'name' | 'type' | 'cashFlowType' | 'usage' | 'rules') => void;
  isUpdating: boolean;
  deletingCategoryId: string | null;
  onEdit: (cat: Category) => void;
  onDeleteClick: (cat: Category) => void;
}

function SortIndicator({
  field,
  sortField,
  sortDirection,
}: {
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}) {
  if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-base-content/20 ml-1 inline-block" />;
  return sortDirection === 'asc' ? (
    <ArrowUp className="w-3.5 h-3.5 text-primary ml-1 inline-block" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-primary ml-1 inline-block" />
  );
}

export default function CategoryTable({
  categories,
  sortedCategories,
  searchQuery,
  onSearchChange,
  sortField,
  sortDirection,
  onSort,
  isUpdating,
  deletingCategoryId,
  onEdit,
  onDeleteClick,
}: CategoryTableProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  if (categories.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold text-primary flex items-center gap-2">
            <Tags className="h-5 w-5" /> {t('storedCategories')}
          </h2>
          <div className="text-center py-16 text-base-content/50 flex flex-col items-center gap-4">
            <Tags className="h-12 w-12 text-base-content/30" />
            <div>
              <h3 className="font-bold text-lg text-base-content/75">{t('noCategoriesFound')}</h3>
              <p className="text-sm text-base-content/40 max-w-sm mt-1">{t('getStarted')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
        <h2 className="card-title text-xl font-bold text-primary flex items-center gap-2">
          <Tags className="h-5 w-5" /> {t('storedCategories')}
        </h2>

        <div className="form-control w-full max-w-xs mt-2 mb-4 relative">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content focus:outline-none"
              aria-label={tCommon('clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {sortedCategories.length === 0 ? (
          <div className="text-center py-16 text-base-content/50 flex flex-col items-center gap-2">
            <p className="font-bold text-lg text-base-content/75">{tCommon('noResults')}</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto w-full mt-4 relative">
            <table className="table w-full">
              <caption className="sr-only">List of transactions categories and actions</caption>
              <thead className="sticky top-0 bg-base-100 z-10 shadow-xs">
                <tr className="border-b border-base-200">
                  <th>
                    <button
                      onClick={() => onSort('name')}
                      className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                      aria-label="Sort by category name"
                    >
                      <span className="truncate">{t('categoryName')}</span>{' '}
                      <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => onSort('type')}
                      className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                      aria-label="Sort by category type"
                    >
                      <span>{t('type')}</span> <SortIndicator field="type" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => onSort('cashFlowType')}
                      className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                      aria-label="Sort by cash flow section"
                    >
                      <span className="truncate">{t('cashFlow')}</span>{' '}
                      <SortIndicator field="cashFlowType" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="text-center">
                    <button
                      onClick={() => onSort('rules')}
                      className="font-bold flex items-center justify-center w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                      aria-label="Sort by match rules count"
                    >
                      <span>{t('matchRules')}</span> <SortIndicator field="rules" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="text-center">
                    <button
                      onClick={() => onSort('usage')}
                      className="font-bold flex items-center justify-center w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                      aria-label="Sort by transaction usage count"
                    >
                      <span>{t('usage')}</span> <SortIndicator field="usage" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="text-center">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => {
                  const isDeleting = deletingCategoryId === cat.id;
                  return (
                    <tr key={cat.id} className="hover:bg-base-200/50 border-b border-base-200">
                      <td className="whitespace-normal break-words">
                        <div className="font-bold">{cat.name}</div>
                      </td>
                      <td className="whitespace-normal">
                        <span
                          className={`badge badge-sm font-semibold block w-fit truncate ${
                            cat.type === 'INCOME'
                              ? 'badge-success text-success-content'
                              : cat.type === 'EXPENSE'
                              ? 'badge-error text-error-content'
                              : 'badge-warning text-warning-content'
                          }`}
                        >
                          {cat.type === 'INCOME'
                            ? t('typeIncome')
                            : cat.type === 'EXPENSE'
                            ? t('typeExpense')
                            : t('typeTransfer')}
                        </span>
                      </td>
                      <td className="whitespace-normal">
                        <span className="badge badge-outline badge-sm font-bold opacity-75 block w-fit truncate">
                          {cat.cashFlowType === 'OPERATING'
                            ? t('cfOperating')
                            : cat.cashFlowType === 'INVESTING'
                            ? t('cfInvesting')
                            : t('cfFinancing')}
                        </span>
                      </td>
                      <td className="text-center font-mono font-bold text-sm whitespace-normal">
                        {t('rulesCount', { count: cat.rulesCount || 0 })}
                      </td>
                      <td className="text-center font-mono font-bold text-sm whitespace-normal">
                        {t('txCount', { count: cat.transactionsCount })}
                      </td>
                      <td className="text-center whitespace-normal">
                        <div className="flex justify-center gap-1">
                          <Button
                            onClick={() => onEdit(cat)}
                            variant="ghost"
                            size="xs"
                            className="text-info hover:bg-info/10 px-1"
                            disabled={isUpdating || deletingCategoryId !== null}
                            aria-label={`Edit ${cat.name}`}
                          >
                            {t('edit')}
                          </Button>
                          <Button
                            onClick={() => onDeleteClick(cat)}
                            variant="ghost"
                            size="xs"
                            className="text-error hover:bg-error/10 px-1"
                            disabled={isUpdating || deletingCategoryId !== null}
                            loading={isDeleting}
                            aria-label={`Delete ${cat.name}`}
                          >
                            {t('delete')}
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
      </div>
    </div>
  );
}
