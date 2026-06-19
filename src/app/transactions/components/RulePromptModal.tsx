'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui';
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onConfirm(false)}
            disabled={isPending}
          >
            {t('rulePrompt.skipBtn')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirm(true)}
            disabled={isPending}
            loading={isPending}
          >
            {t('rulePrompt.createRuleBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
