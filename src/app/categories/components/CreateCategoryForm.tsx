'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

interface CreateCategoryFormProps {
  isCreating: boolean;
  onSubmit: (name: string, type: string, cfType: string) => Promise<void>;
}

export default function CreateCategoryForm({ isCreating, onSubmit }: CreateCategoryFormProps) {
  const t = useTranslations('categories');
  const [name, setName] = useState('');
  const [catType, setCatType] = useState('EXPENSE');
  const [cfType, setCfType] = useState('OPERATING');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim(), catType, cfType);
    setName('');
    setCatType('EXPENSE');
    setCfType('OPERATING');
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
        <h2 className="card-title text-xl font-bold text-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> {t('createCategory')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="form-control w-full">
            <label className="label" htmlFor="new-category-name">
              <span className="label-text font-bold">{t('newCategoryName')}</span>
            </label>
            <input
              id="new-category-name"
              type="text"
              placeholder={t('newCategoryNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
              required
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="new-category-type">
              <span className="label-text font-bold">{t('newCategoryType')}</span>
            </label>
            <select
              id="new-category-type"
              value={catType}
              onChange={(e) => setCatType(e.target.value)}
              className="select select-bordered w-full"
              disabled={isCreating}
            >
              <option value="EXPENSE">{t('expenseOption')}</option>
              <option value="INCOME">{t('incomeOption')}</option>
              <option value="TRANSFER">{t('transferOption')}</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="new-category-cf-type">
              <span className="label-text font-bold">{t('newCategoryCFType')}</span>
            </label>
            <select
              id="new-category-cf-type"
              value={cfType}
              onChange={(e) => setCfType(e.target.value)}
              className="select select-bordered w-full"
              disabled={isCreating}
            >
              <option value="OPERATING">{t('operatingOption')}</option>
              <option value="INVESTING">{t('investingOption')}</option>
              <option value="FINANCING">{t('financingOption')}</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? t('creating') : t('addCategory')}
          </button>
        </form>
      </div>
    </div>
  );
}
