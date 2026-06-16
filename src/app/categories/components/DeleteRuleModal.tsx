'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

interface DeleteRuleModalProps {
  ruleToDelete: { id: string; catId: string; pattern: string };
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteRuleModal({
  ruleToDelete,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteRuleModalProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  return (
    <div
      className="modal modal-open z-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-rule-modal-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
        <h3 id="delete-rule-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {t('ruleDeleteConfirm')}
        </h3>
        <p className="py-4 text-base-content/80 text-sm">
          {t('ruleDeleteWarning', { pattern: ruleToDelete.pattern })}
        </p>
        <div className="modal-action">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            disabled={isDeleting}
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-error btn-sm"
            disabled={isDeleting}
          >
            {isDeleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
