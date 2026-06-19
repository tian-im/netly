'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button, Input, Select, Card } from '@/app/components/ui';

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
    <Card>
      <Card.Body>
        <Card.Title icon={<Plus className="h-5 w-5" />}>
          {t('createCategory')}
        </Card.Title>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Input
            id="new-category-name"
            label={t('newCategoryName')}
            type="text"
            placeholder={t('newCategoryNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isCreating}
            autoFocus
          />

          <Select
            id="new-category-type"
            label={t('newCategoryType')}
            value={catType}
            onChange={(e) => setCatType(e.target.value)}
            disabled={isCreating}
          >
            <option value="EXPENSE">{t('expenseOption')}</option>
            <option value="INCOME">{t('incomeOption')}</option>
            <option value="TRANSFER">{t('transferOption')}</option>
          </Select>

          <Select
            id="new-category-cf-type"
            label={t('newCategoryCFType')}
            value={cfType}
            onChange={(e) => setCfType(e.target.value)}
            disabled={isCreating}
          >
            <option value="OPERATING">{t('operatingOption')}</option>
            <option value="INVESTING">{t('investingOption')}</option>
            <option value="FINANCING">{t('financingOption')}</option>
          </Select>

          <Button
            type="submit"
            className="w-full mt-2"
            loading={isCreating}
            disabled={!name.trim()}
          >
            {t('addCategory')}
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
}
