'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
}: DeleteConfirmModalProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal modal-open z-55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div className="modal-box border border-error/20 shadow-2xl bg-base-100 max-w-md">
        <h3 id="delete-modal-title" className="font-black text-lg text-error">
          {t('deleteConfirmTitle')}
        </h3>
        <p id="delete-modal-description" className="py-4 text-sm text-base-content/85">
          {count === 1 ? t('deleteConfirmDesc') : t('bulkDeleteConfirmDesc', { count })}
        </p>
        <div className="modal-action">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant="error"
            size="sm"
            className="font-bold"
            onClick={onConfirm}
          >
            {t('bulkDelete')} ({count})
          </Button>
        </div>
      </div>
    </div>
  );
}
