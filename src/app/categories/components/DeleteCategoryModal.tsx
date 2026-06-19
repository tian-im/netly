'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui';
import type { Category } from '../types';

interface DeleteCategoryModalProps {
  categoryToDelete: Category;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteCategoryModal({
  categoryToDelete,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteCategoryModalProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  return (
    <div
      className="modal modal-open z-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
        <h3 id="delete-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {t('confirmDelete')}
        </h3>
        <p className="py-4 text-base-content/80 text-sm">
          {categoryToDelete.transactionsCount > 0 ? (
            <span>
              {t('deleteWarningUsage', {
                name: categoryToDelete.name,
                count: categoryToDelete.transactionsCount,
              })}
            </span>
          ) : (
            <span>{t('deleteWarningSimple', { name: categoryToDelete.name })}</span>
          )}
        </p>
        <div className="modal-action">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant="error"
            size="sm"
            loading={isDeleting}
            onClick={onConfirm}
          >
            {t('deleteCategoryBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
