import { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { useLocaleContext } from '../../providers';
import { useTranslations } from 'next-intl';

interface PreferencesCardProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const THEMES = [
  { id: 'night', name: 'Night (Default)' },
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
  { id: 'luxury', name: 'Luxury' },
  { id: 'retro', name: 'Retro' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'forest', name: 'Forest' },
  { id: 'synthwave', name: 'Synthwave' },
  { id: 'coffee', name: 'Coffee' },
];

export default function PreferencesCard({ showToast }: PreferencesCardProps) {
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('settings');
  const tReports = useTranslations('reports');

  const [defaultCurrency, setDefaultCurrency] = useState('AUD');
  const [defaultRange, setDefaultRange] = useState('Month');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [currentTheme, setCurrentTheme] = useState('night');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedCurrency = localStorage.getItem('netly_pref_default_currency') || 'AUD';
    const savedRange = localStorage.getItem('netly_pref_default_date_range') || 'Month';
    const savedFormat = localStorage.getItem('netly_pref_date_format') || 'YYYY-MM-DD';
    const savedTheme = localStorage.getItem('netly_pref_theme') || 'night';

    setDefaultCurrency(savedCurrency);
    setDefaultRange(savedRange);
    setDateFormat(savedFormat);
    setCurrentTheme(savedTheme);
    setMounted(true);
  }, []);

  const handleCurrencyChange = (curr: string) => {
    setDefaultCurrency(curr);
    localStorage.setItem('netly_pref_default_currency', curr);
    showToast(t('currencySet', { currency: curr }));
  };

  const handleRangeChange = (range: string) => {
    setDefaultRange(range);
    localStorage.setItem('netly_pref_default_date_range', range);
    showToast(t('periodSet', { period: range }));
  };

  const handleDateFormatChange = (fmt: string) => {
    setDateFormat(fmt);
    localStorage.setItem('netly_pref_date_format', fmt);
    showToast(t('dateFormatSet', { format: fmt }));
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('netly_pref_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    showToast(t('themeSet', { theme }));
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
            <label className="label py-1" htmlFor="theme-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('themeLabel')}
              </span>
            </label>
            <select
              id="theme-select"
              value={mounted ? currentTheme : 'night'}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="select select-bordered select-sm w-full"
              disabled={!mounted}
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.id === 'night' ? t('themeDefault') : theme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label py-1" htmlFor="currency-select">
              <span className="label-text text-xs font-bold text-base-content/75">
                {t('currencyLabel')}
              </span>
            </label>
            <select
              id="currency-select"
              value={mounted ? defaultCurrency : 'AUD'}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="select select-bordered select-sm w-full"
              disabled={!mounted}
            >
              <option value="AUD">{t('currencyOptionAud')}</option>
              <option value="USD">{t('currencyOptionUsd')}</option>
              <option value="EUR">{t('currencyOptionEur')}</option>
              <option value="GBP">{t('currencyOptionGbp')}</option>
              <option value="CAD">{t('currencyOptionCad')}</option>
            </select>
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
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-06-09)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (09/06/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (06/09/2026)</option>
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
              <option value="en">English</option>
              <option value="zh">中文 (简体)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
