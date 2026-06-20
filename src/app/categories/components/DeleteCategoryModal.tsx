'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@/app/components/ui';
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
    <Modal
      isOpen={true}
      onClose={onClose}
      zIndex="z-40"
      maxWidth="md"
      aria-labelledby="delete-modal-title"
    >
      <Modal.Header>
        <Modal.Title color="error" icon={<AlertTriangle className="h-5 w-5" />} id="delete-modal-title">
          {t('confirmDelete')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
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
          {t('deleteCategoryBtn')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
