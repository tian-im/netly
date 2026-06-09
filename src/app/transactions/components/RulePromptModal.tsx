'use client';

import { useTranslations } from 'next-intl';
import { Transaction, Category } from '../types';

interface RulePromptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categoryId: string;
  categories: Category[];
  isPending: boolean;
  onConfirm: (createRule: boolean) => void;
}

export default function RulePromptModal({
  isOpen,
  transaction,
  categoryId,
  categories,
  isPending,
  onConfirm,
}: RulePromptModalProps) {
  const t = useTranslations('transactions');

  if (!isOpen || !transaction) return null;

  const targetCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="modal modal-open z-55" role="dialog" aria-modal="true" aria-labelledby="rule-modal-title">
      <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
        <h3 id="rule-modal-title" className="font-black text-lg text-primary">
          {t('rulePrompt.title')}
        </h3>
        <p className="py-4 text-sm text-base-content/85">
          {t('rulePrompt.desc', {
            pattern: transaction.payee,
            category: targetCategory?.name || 'Unknown',
          })}
        </p>
        <div className="modal-action">
          <button
            onClick={() => onConfirm(false)}
            className="btn btn-outline btn-sm"
            disabled={isPending}
          >
            {t('rulePrompt.skipBtn')}
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            {t('rulePrompt.createRuleBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
