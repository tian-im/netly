'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, AlertTriangle } from 'lucide-react';
import type { Category } from '../types';

interface EditCategoryModalProps {
  editingCategory: Category;
  isUpdating: boolean;
  onSave: (id: string, name: string, type: string, cfType: string) => Promise<void>;
  onClose: () => void;
}

export default function EditCategoryModal({
  editingCategory,
  isUpdating,
  onSave,
  onClose,
}: EditCategoryModalProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const [editName, setEditName] = useState(editingCategory.name);
  const [editType, setEditType] = useState(editingCategory.type);
  const [editCFType, setEditCFType] = useState(editingCategory.cashFlowType);
  const [showDiscard, setShowDiscard] = useState(false);

  // Reset form when editingCategory changes
  useEffect(() => {
    setEditName(editingCategory.name);
    setEditType(editingCategory.type);
    setEditCFType(editingCategory.cashFlowType);
    setShowDiscard(false);
  }, [editingCategory]);

  const isDirty =
    editName !== editingCategory.name ||
    editType !== editingCategory.type ||
    editCFType !== editingCategory.cashFlowType;

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  };

  const handleDiscardConfirm = () => {
    setShowDiscard(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await onSave(editingCategory.id, editName.trim(), editType, editCFType);
  };

  return (
    <>
      <div
        className="modal modal-open z-40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }}
      >
        <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
          <h3 id="edit-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
            <Pencil className="h-4 w-4" /> {t('editCategory')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="form-control w-full">
              <label className="label" htmlFor="edit-category-name">
                <span className="label-text font-bold">{t('categoryName')}</span>
              </label>
              <input
                id="edit-category-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input input-bordered w-full"
                required
                disabled={isUpdating}
                autoFocus
              />
            </div>

            <div className="form-control w-full">
              <label className="label" htmlFor="edit-category-type">
                <span className="label-text font-bold">{t('newCategoryType')}</span>
              </label>
              <select
                id="edit-category-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="select select-bordered w-full"
                disabled={isUpdating}
              >
                <option value="EXPENSE">{t('expenseOption')}</option>
                <option value="INCOME">{t('incomeOption')}</option>
                <option value="TRANSFER">{t('transferOption')}</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label" htmlFor="edit-category-cf-type">
                <span className="label-text font-bold">{t('newCategoryCFType')}</span>
              </label>
              <select
                id="edit-category-cf-type"
                value={editCFType}
                onChange={(e) => setEditCFType(e.target.value)}
                className="select select-bordered w-full"
                disabled={isUpdating}
              >
                <option value="OPERATING">{t('operatingOption')}</option>
                <option value="INVESTING">{t('investingOption')}</option>
                <option value="FINANCING">{t('financingOption')}</option>
              </select>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-ghost"
                disabled={isUpdating}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUpdating || !editName.trim()}
              >
                {isUpdating ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Discard Changes Confirmation Modal */}
      {showDiscard && (
        <div
          className="modal modal-open z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-modal-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDiscard(false); }}
        >
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="discard-modal-title" className="font-bold text-lg text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {tCommon('discardChanges')}
            </h3>
            <p className="py-4 text-base-content/80 text-sm">{tCommon('discardChangesConfirm')}</p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowDiscard(false)}
                className="btn btn-ghost btn-sm"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDiscardConfirm}
                className="btn btn-warning btn-sm"
              >
                {tCommon('discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
