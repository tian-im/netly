'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getPeriodDateRange } from '@/lib/links';
import { formatDateISO } from '@/lib/dates';

import { Select } from '@/app/components/ui';

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

  const presetList = useMemo(() => [
    { key: 'this-month', label: t('datePresets.thisMonth') },
    { key: 'last-month', label: t('datePresets.month') },
    { key: 'three-months', label: t('datePresets.threeMonths') },
    { key: 'six-months', label: t('datePresets.sixMonths') },
    { key: 'twelve-months', label: t('datePresets.twelveMonths') },
    { key: 'ytd', label: t('datePresets.ytd') },
    { key: 'last-quarter', label: t('datePresets.lastQuarter') },
    { key: 'this-year', label: t('datePresets.thisYear') },
    { key: 'all-time', label: t('datePresets.allTime') },
  ], [t]);

  const todayStr = formatDateISO(new Date());

  const presetRanges = useMemo(() => {
    const now = new Date();
    const nowY = now.getUTCFullYear();
    const nowM = now.getUTCMonth();

    const getPresetDates = (preset: string) => {
      let startStr = '';
      let endStr = todayStr;

      switch (preset) {
        case 'this-month':
          ({ start: startStr, end: endStr } = getPeriodDateRange('current', now));
          break;
        case 'last-month': {
          const startOfLastMonth = new Date(Date.UTC(nowY, nowM - 1, 1));
          const endOfLastMonth = new Date(Date.UTC(nowY, nowM, 0));
          startStr = formatDateISO(startOfLastMonth);
          endStr = formatDateISO(endOfLastMonth);
          break;
        }
        case 'three-months':
          ({ start: startStr, end: endStr } = getPeriodDateRange('3m', now));
          break;
        case 'six-months':
          ({ start: startStr, end: endStr } = getPeriodDateRange('6m', now));
          break;
        case 'twelve-months':
          ({ start: startStr, end: endStr } = getPeriodDateRange('12m', now));
          break;
        case 'ytd':
          ({ start: startStr, end: endStr } = getPeriodDateRange('ytd', now));
          break;
        case 'last-quarter': {
          const currentQuarter = Math.floor(nowM / 3);
          const prevQuarter = (currentQuarter - 1 + 4) % 4;
          const year = prevQuarter === 3 ? nowY - 1 : nowY;
          const startMonth = prevQuarter * 3;
          const endMonth = prevQuarter * 3 + 2;
          const startDate = new Date(Date.UTC(year, startMonth, 1));
          const endDate = new Date(Date.UTC(year, endMonth + 1, 0)); // Last day of end month
          startStr = formatDateISO(startDate);
          endStr = formatDateISO(endDate);
          break;
        }
        case 'this-year': {
          const startOfCurYear = new Date(Date.UTC(nowY, 0, 1));
          startStr = formatDateISO(startOfCurYear);
          break;
        }
        case 'all-time': {
          startStr = '1970-01-01';
          break;
        }
      }
      return { start: startStr, end: endStr };
    };

    const ranges: Record<string, { start: string; end: string }> = {};
    presetList.forEach((p) => {
      ranges[p.key] = getPresetDates(p.key);
    });
    return ranges;
  }, [presetList, todayStr]);

  const currentPreset = useMemo(() => {
    const matchingPreset = presetList.find((preset) => {
      const range = presetRanges[preset.key];
      return startDateStr === range.start && endDateStr === range.end;
    });
    return matchingPreset?.key || 'custom';
  }, [presetList, presetRanges, startDateStr, endDateStr]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val !== 'custom') {
      const range = presetRanges[val];
      onSelectRange(range.start, range.end);
    }
  };

  return (
    <Select
      id="date-preset-select"
      label={t('datePresets.presetsLabel')}
      value={currentPreset}
      onChange={handlePresetChange}
      size="sm"
      className="md:max-w-xs"
    >
      <option value="custom" hidden disabled>
        {t('datePresets.custom')}
      </option>
      {presetList.map((preset) => (
        <option key={preset.key} value={preset.key}>
          {preset.label}
        </option>
      ))}
    </Select>
  );
}

