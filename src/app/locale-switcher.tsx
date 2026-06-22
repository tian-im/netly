'use client';

import { useLocaleContext } from './providers';
import { useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { Select } from '@/app/components/ui';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('nav');

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-base-200/40 rounded-lg border border-base-200">
      <Languages className="w-4 h-4 text-primary shrink-0" />
      <span className="text-xs font-bold text-base-content/60 uppercase tracking-wider">{t('languageLabel')}</span>
      <Select
        value={locale}
        onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
        variant="ghost"
        size="xs"
        className="max-w-xs font-bold text-xs"
        aria-label={t('languageToggleAriaLabel')}
      >
        <option value="en">English</option>
        <option value="zh">中文 (简体)</option>
      </Select>
    </div>
  );
}
