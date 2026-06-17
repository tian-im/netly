import { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { useLocaleContext } from '../../providers';
import { useTranslations } from 'next-intl';
import CurrencySelector from '@/app/components/CurrencySelector';
import { PREFERENCES, getPreference, setPreference } from '@/lib/preferences';

interface PreferencesCardProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PreferencesCard({ showToast }: PreferencesCardProps) {
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('settings');
  const tReports = useTranslations('reports');

  // WHY: Use PREFERENCES defaults for SSR initial state. On mount, the useEffect
  // reads actual values via getPreference (cookie → localStorage → default).
  // Explicit <string> generics are needed because as const makes the defaults
  // literal types (e.g. 'AUD'), which breaks setState with getPreference's string return.
  const [defaultCurrency, setDefaultCurrency] = useState<string>(PREFERENCES.defaultCurrency.default);
  const [defaultRange, setDefaultRange] = useState<string>(PREFERENCES.dateRange.default);
  const [dateFormat, setDateFormat] = useState<string>(PREFERENCES.dateFormat.default);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // WHY: Using getPreference instead of raw localStorage.getItem ensures
    // the read follows the unified cookie-first hierarchy and handles
    // one-time migration for legacy localStorage-only values.
    setDefaultCurrency(getPreference(PREFERENCES.defaultCurrency));
    setDefaultRange(getPreference(PREFERENCES.dateRange));
    setDateFormat(getPreference(PREFERENCES.dateFormat));
    setMounted(true);
  }, []);

  // WHY: Using setPreference ensures dual-write to both localStorage and
  // cookie, with the cookie key defined in one place (PREFERENCES).
  const handleCurrencyChange = (curr: string) => {
    setDefaultCurrency(curr);
    setPreference(PREFERENCES.defaultCurrency, curr);
    showToast(t('currencySet', { currency: curr }));
  };

  const handleRangeChange = (range: string) => {
    setDefaultRange(range);
    setPreference(PREFERENCES.dateRange, range);
    showToast(t('periodSet', { period: range }));
  };

  const handleDateFormatChange = (fmt: string) => {
    setDateFormat(fmt);
    setPreference(PREFERENCES.dateFormat, fmt);
    showToast(t('dateFormatSet', { format: `${fmt} (${getFormatExample(fmt)})` }));
  };

  const getFormatExample = (formatStr: string) => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    if (formatStr === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    if (formatStr === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (formatStr === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    return '';
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
          <Sliders className="h-5 w-5 text-primary" />
          {t('preferencesTitle')}
        </h2>
        <p className="text-xs text-base-content/60 mb-4">
          {t('preferencesDesc')}
        </p>

        <div className="space-y-4">
          <div className="form-control w-full">
            <label className="label py-1" htmlFor="currency-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('currencyLabel')}
              </span>
            </label>
            <CurrencySelector
              id="currency-select"
              value={mounted ? defaultCurrency : PREFERENCES.defaultCurrency.default}
              onChange={handleCurrencyChange}
              disabled={!mounted}
              className="w-full"
              placeholder={t('currencyLabel')}
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1" htmlFor="range-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('dateRangeLabel')}
              </span>
            </label>
            <select
              id="range-select"
              value={mounted ? defaultRange : 'Month'}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="select select-bordered select-sm w-full"
              disabled={!mounted}
            >
              <option value="Month">{tReports('datePresets.month')}</option>
              <option value="3m">{tReports('datePresets.threeMonths')}</option>
              <option value="6m">{tReports('datePresets.sixMonths')}</option>
              <option value="ytd">{tReports('datePresets.ytd')}</option>
              <option value="12m">{tReports('datePresets.twelveMonths')}</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1" htmlFor="date-format-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('dateFormatLabel')}
              </span>
            </label>
            <select
              id="date-format-select"
              value={mounted ? dateFormat : 'YYYY-MM-DD'}
              onChange={(e) => handleDateFormatChange(e.target.value)}
              className="select select-bordered select-sm w-full"
              disabled={!mounted}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD ({getFormatExample('YYYY-MM-DD')})</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY ({getFormatExample('DD/MM/YYYY')})</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY ({getFormatExample('MM/DD/YYYY')})</option>
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1" htmlFor="language-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('languageLabel')}
              </span>
            </label>
            <select
              id="language-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
              className="select select-bordered select-sm w-full"
              aria-label={t('languageToggleAriaLabel')}
            >
              <option value="en">{t('languages.en')}</option>
              <option value="zh">{t('languages.zh')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
