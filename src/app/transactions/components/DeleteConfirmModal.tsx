'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

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
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-error btn-sm font-bold"
          >
            {t('bulkDelete')} ({count})
          </button>
        </div>
      </div>
    </div>
  );
}
