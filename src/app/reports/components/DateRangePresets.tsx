'use client';

import { useTranslations } from 'next-intl';

interface DateRangePresetsProps {
  onSelectRange: (start: string, end: string) => void;
}

export default function DateRangePresets({ onSelectRange }: DateRangePresetsProps) {
  const t = useTranslations('reports');

  const handlePreset = (preset: 'this-month' | 'last-quarter' | 'this-year' | 'all-time') => {
    const now = new Date();
    let startStr = '';
    let endStr = now.toISOString().split('T')[0];

    switch (preset) {
      case 'this-month': {
        const startOfCurMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = startOfCurMonth.toISOString().split('T')[0];
        break;
      }
      case 'last-quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const prevQuarter = (currentQuarter - 1 + 4) % 4;
        const year = prevQuarter === 3 ? now.getFullYear() - 1 : now.getFullYear();
        const startMonth = prevQuarter * 3;
        const endMonth = prevQuarter * 3 + 2;
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, endMonth + 1, 0); // Last day of end month
        startStr = startDate.toISOString().split('T')[0];
        endStr = endDate.toISOString().split('T')[0];
        break;
      }
      case 'this-year': {
        const startOfCurYear = new Date(now.getFullYear(), 0, 1);
        startStr = startOfCurYear.toISOString().split('T')[0];
        break;
      }
      case 'all-time': {
        startStr = '1970-01-01';
        break;
      }
    }

    onSelectRange(startStr, endStr);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-start mt-2">
      <span className="text-xs font-bold text-base-content/60">{t('datePresets.presetsLabel')}</span>
      <button
        onClick={() => handlePreset('this-month')}
        className="btn btn-xs btn-outline hover:btn-primary"
      >
        {t('datePresets.thisMonth')}
      </button>
      <button
        onClick={() => handlePreset('last-quarter')}
        className="btn btn-xs btn-outline hover:btn-primary"
      >
        {t('datePresets.lastQuarter')}
      </button>
      <button
        onClick={() => handlePreset('this-year')}
        className="btn btn-xs btn-outline hover:btn-primary"
      >
        {t('datePresets.thisYear')}
      </button>
      <button
        onClick={() => handlePreset('all-time')}
        className="btn btn-xs btn-outline hover:btn-primary"
      >
        {t('datePresets.allTime')}
      </button>
    </div>
  );
}
