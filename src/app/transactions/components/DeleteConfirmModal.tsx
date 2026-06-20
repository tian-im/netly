'use client';

import { useTranslations } from 'next-intl';
import { Button, Modal } from '@/app/components/ui';

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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-55"
      maxWidth="md"
      className="border-error/20"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <Modal.Header>
        <Modal.Title color="error" className="font-black" id="delete-modal-title">
          {t('deleteConfirmTitle')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body id="delete-modal-description">
        {count === 1 ? t('deleteConfirmDesc') : t('bulkDeleteConfirmDesc', { count })}
      </Modal.Body>
      <Modal.Actions>
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
      </Modal.Actions>
    </Modal>
  );
}
