'use client';

import { useTranslations } from 'next-intl';
import { Button, Modal } from '@/app/components/ui';
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
    <Modal
      isOpen={isOpen}
      onClose={() => onConfirm(false)}
      zIndex="z-55"
      maxWidth="md"
      aria-labelledby="rule-modal-title"
    >
      <Modal.Header>
        <Modal.Title color="primary" className="font-black" id="rule-modal-title">
          {t('rulePrompt.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {t('rulePrompt.desc', {
          pattern: transaction.payee,
          category: targetCategory?.name || 'Unknown',
        })}
      </Modal.Body>
      <Modal.Actions>
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
      </Modal.Actions>
    </Modal>
  );
}
