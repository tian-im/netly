'use client';

import { useTranslations } from 'next-intl';

interface DateRangePresetsProps {
  onSelectRange: (start: string, end: string) => void;
  startDateStr: string;
  endDateStr: string;
}

export default function DateRangePresets({
  onSelectRange,
  startDateStr,
  endDateStr,
}: DateRangePresetsProps) {
  const t = useTranslations('reports');

  const getPresetDates = (preset: string) => {
    const now = new Date();
    let startStr = '';
    let endStr = now.toISOString().split('T')[0];

    switch (preset) {
      case 'this-month': {
        const startOfCurMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = startOfCurMonth.toISOString().split('T')[0];
        break;
      }
      case 'last-month': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        startStr = startOfLastMonth.toISOString().split('T')[0];
        endStr = endOfLastMonth.toISOString().split('T')[0];
        break;
      }
      case 'three-months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        startStr = start.toISOString().split('T')[0];
        break;
      }
      case 'six-months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        startStr = start.toISOString().split('T')[0];
        break;
      }
      case 'twelve-months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        startStr = start.toISOString().split('T')[0];
        break;
      }
      case 'ytd': {
        const startOfCurYear = new Date(now.getFullYear(), 0, 1);
        startStr = startOfCurYear.toISOString().split('T')[0];
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
      default: {
        // Fallback: unrecognized preset — leave start empty to let the caller handle it
        break;
      }
    }
    return { startStr, endStr };
  };

  const handlePreset = (preset: string) => {
    const { startStr, endStr } = getPresetDates(preset);
    onSelectRange(startStr, endStr);
  };

  const isActive = (preset: string) => {
    const { startStr, endStr } = getPresetDates(preset);
    return startDateStr === startStr && endDateStr === endStr;
  };

  const presetList = [
    { key: 'this-month', label: t('datePresets.thisMonth') },
    { key: 'last-month', label: t('datePresets.month') },
    { key: 'three-months', label: t('datePresets.threeMonths') },
    { key: 'six-months', label: t('datePresets.sixMonths') },
    { key: 'twelve-months', label: t('datePresets.twelveMonths') },
    { key: 'ytd', label: t('datePresets.ytd') },
    { key: 'last-quarter', label: t('datePresets.lastQuarter') },
    { key: 'this-year', label: t('datePresets.thisYear') },
    { key: 'all-time', label: t('datePresets.allTime') },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center justify-start mt-2">
      <span className="text-xs font-bold text-base-content/60">{t('datePresets.presetsLabel')}</span>
      {presetList.map((preset) => (
        <button
          key={preset.key}
          onClick={() => handlePreset(preset.key)}
          className={`btn btn-xs ${isActive(preset.key) ? 'btn-primary' : 'btn-outline hover:btn-primary'}`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
