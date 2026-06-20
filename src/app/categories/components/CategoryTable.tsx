'use client';

import { useTranslations } from 'next-intl';
import { Tags, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button, Input, Card } from '@/app/components/ui';
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
      <Card>
        <Card.Body>
          <Card.Title icon={<Tags className="h-5 w-5" />}>
            {t('storedCategories')}
          </Card.Title>
          <div className="text-center py-16 text-base-content/50 flex flex-col items-center gap-4">
            <Tags className="h-12 w-12 text-base-content/30" />
            <div>
              <h3 className="font-bold text-lg text-base-content/75">{t('noCategoriesFound')}</h3>
              <p className="text-sm text-base-content/40 max-w-sm mt-1">{t('getStarted')}</p>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title icon={<Tags className="h-5 w-5" />}>
          {t('storedCategories')}
        </Card.Title>

        <div className="form-control w-full max-w-xs mt-2 mb-4 relative">
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-sm w-full pr-8"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="btn-circle absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-base-content focus:outline-none"
              onClick={() => onSearchChange('')}
              aria-label={tCommon('clearSearch')}
              icon={<X className="h-4 w-4" />}
            />
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
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSort('name')}
                      className="font-bold w-full justify-start text-left"
                      aria-label="Sort by category name"
                    >
                      <span className="truncate">{t('categoryName')}</span>{' '}
                      <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                    </Button>
                  </th>
                  <th>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSort('type')}
                      className="font-bold w-full justify-start text-left"
                      aria-label="Sort by category type"
                    >
                      <span>{t('type')}</span> <SortIndicator field="type" sortField={sortField} sortDirection={sortDirection} />
                    </Button>
                  </th>
                  <th>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSort('cashFlowType')}
                      className="font-bold w-full justify-start text-left"
                      aria-label="Sort by cash flow section"
                    >
                      <span className="truncate">{t('cashFlow')}</span>{' '}
                      <SortIndicator field="cashFlowType" sortField={sortField} sortDirection={sortDirection} />
                    </Button>
                  </th>
                  <th className="text-center">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSort('rules')}
                      className="font-bold w-full justify-center"
                      aria-label="Sort by match rules count"
                    >
                      <span>{t('matchRules')}</span> <SortIndicator field="rules" sortField={sortField} sortDirection={sortDirection} />
                    </Button>
                  </th>
                  <th className="text-center">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSort('usage')}
                      className="font-bold w-full justify-center"
                      aria-label="Sort by transaction usage count"
                    >
                      <span>{t('usage')}</span> <SortIndicator field="usage" sortField={sortField} sortDirection={sortDirection} />
                    </Button>
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
                          className={`badge badge-sm font-semibold block w-fit truncate text-white ${
                            cat.type === 'INCOME'
                              ? 'badge-success'
                              : cat.type === 'EXPENSE'
                              ? 'badge-error'
                              : 'badge-warning'
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
                        <span
                          className={`badge badge-sm font-bold block w-fit truncate text-white ${
                            cat.cashFlowType === 'OPERATING'
                              ? 'badge-info'
                              : cat.cashFlowType === 'INVESTING'
                              ? 'badge-primary'
                              : 'badge-secondary'
                          }`}
                        >
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
      </Card.Body>
    </Card>
  );
}
