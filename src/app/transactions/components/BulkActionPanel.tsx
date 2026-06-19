'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Trash2 } from 'lucide-react';
import { Category } from '../types';
import { translateCategoryType } from '@/lib/translate-category';
import DeleteConfirmModal from './DeleteConfirmModal';

interface BulkActionPanelProps {
  selectedCount: number;
  categories: Category[];
  isPending: boolean;
  onClearSelection: () => void;
  onBulkCategorize: (categoryId: string) => void;
  onBulkDelete: () => Promise<void>;
}

export default function BulkActionPanel({
  selectedCount,
  categories,
  isPending,
  onClearSelection,
  onBulkCategorize,
  onBulkDelete,
}: BulkActionPanelProps) {
  const t = useTranslations('transactions');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleDeleteConfirm = async () => {
    setIsConfirmOpen(false);
    await onBulkDelete();
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-bounce-short">
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-base-100/90 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl px-6 py-4 max-w-xl">
          {/* Selected count info */}
          <div className="flex items-center gap-2">
            <span className="badge badge-primary font-mono font-bold py-3 text-sm">
              {selectedCount}
            </span>
            <span className="text-sm font-semibold text-base-content whitespace-nowrap">
              {t('bulkSelectedCount', { count: selectedCount })}
            </span>
          </div>

          {/* Separator on desktop */}
          <span className="hidden sm:block w-px h-6 bg-base-300" />

          {/* Categorization controls & Delete */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onBulkCategorize(e.target.value);
                  e.target.value = ''; // Reset selection
                }
              }}
              className="select select-primary select-sm w-full sm:w-48 font-semibold"
              disabled={isPending}
              defaultValue=""
            >
              <option value="" disabled>
                {t('bulkSelectCategory')}
              </option>
              <option value="UNCATEGORIZED">{t('table.uncategorized')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({translateCategoryType(t, c.type)})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="btn btn-error btn-sm font-bold gap-1.5 whitespace-nowrap"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('bulkDelete')}</span>
            </button>

            {/* Cancel selection */}
            <button
              type="button"
              onClick={onClearSelection}
              className="btn btn-ghost btn-sm btn-circle text-base-content/60"
              title={t('bulkDeselectAll')}
              aria-label={t('bulkDeselectAllAria')}
              disabled={isPending}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        count={selectedCount}
      />
    </>
  );
}
