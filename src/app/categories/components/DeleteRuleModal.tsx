'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@/app/components/ui';

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
    <Modal
      isOpen={true}
      onClose={onClose}
      zIndex="z-40"
      aria-labelledby="delete-rule-modal-title"
    >
      <Modal.Header showBorder onClose={onClose}>
        <Modal.Title
          color="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          id="delete-rule-modal-title"
        >
          {t('ruleDeleteConfirm')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {t('ruleDeleteWarning', { pattern: ruleToDelete.pattern })}
      </Modal.Body>
      <Modal.Actions>
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
          {t('delete')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
