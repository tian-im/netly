'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { useLocaleContext } from '../providers';
import {
  resetDatabase,
  vacuumDatabase,
  exportAllTransactions,
  exportAllAccounts,
} from '../actions';
import {
  BarChart3,
  AlertTriangle,
  Trash2,
  Database,
  Download,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Settings,
  ShieldAlert,
  History as HistoryIcon,
} from 'lucide-react';

interface SettingsClientProps {
  accountsCount: number;
  transactionsCount: number;
  rulesCount: number;
  dbInfo: {
    fileSize: number;
    lastModified: string;
    schemaVersion: string;
    lastImportTimestamp: string | null;
  };
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
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

export default function SettingsClient({
  accountsCount,
  transactionsCount,
  rulesCount,
  dbInfo,
}: SettingsClientProps) {
  const router = useRouter();
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tReports = useTranslations('reports');
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modal & Confirmation states
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Local preferences states
  const [defaultCurrency, setDefaultCurrency] = useState('AUD');
  const [defaultRange, setDefaultRange] = useState('Month');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [currentTheme, setCurrentTheme] = useState('night');

  useEffect(() => {
    // Read local preferences
    const savedCurrency = localStorage.getItem('netly_pref_default_currency') || 'AUD';
    const savedRange = localStorage.getItem('netly_pref_default_date_range') || 'Month';
    const savedFormat = localStorage.getItem('netly_pref_date_format') || 'YYYY-MM-DD';
    const savedTheme = localStorage.getItem('netly_pref_theme') || 'night';

    setDefaultCurrency(savedCurrency);
    setDefaultRange(savedRange);
    setDateFormat(savedFormat);
    setCurrentTheme(savedTheme);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

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

  const handleVacuum = async () => {
    setIsVacuuming(true);
    try {
      await vacuumDatabase();
      showToast(t('dbVacuumSuccess'));
      router.refresh();
    } catch (err: any) {
      showToast(err.message || t('dbVacuumFailed'), 'error');
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleExportTransactions = async () => {
    setIsExporting(true);
    try {
      const txs = await exportAllTransactions();
      const { generateLedgerCSV, downloadCSV } = await import('@/lib/csv-export');
      const csvContent = generateLedgerCSV(txs as any);
      downloadCSV(csvContent, `netly_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: any) {
      showToast(err.message || t('exportFailed'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAccounts = async () => {
    setIsExporting(true);
    try {
      const accs = await exportAllAccounts();
      const csvRows = ['ID,Name,Type,Starting Balance,Currency,Created At'];
      for (const acc of accs) {
        const cleanName = acc.name.replace(/"/g, '""');
        const dateStr = acc.createdAt ? new Date(acc.createdAt).toISOString().split('T')[0] : '';
        csvRows.push(`"${acc.id}","${cleanName}","${acc.type}",${acc.startingBalance},"${acc.currency}","${dateStr}"`);
      }
      const csvContent = csvRows.join('\n');
      const { downloadCSV } = await import('@/lib/csv-export');
      downloadCSV(csvContent, `netly_accounts_${new Date().toISOString().split('T')[0]}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: any) {
      showToast(err.message || t('exportFailed'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetDbConfirm = async () => {
    if (wipeConfirmInput !== 'WIPE') return;

    startTransition(async () => {
      try {
        await resetDatabase();
        showToast(t('wipeSuccess'));
        setShowWipeModal(false);
        setWipeConfirmInput('');
        router.refresh();
      } catch (err: any) {
        showToast(err.message || t('wipeFailed'), 'error');
      }
    });
  };

  const formattedFileSize = dbInfo.fileSize
    ? (dbInfo.fileSize / 1024).toFixed(1) + ' KB'
    : tCommon('unknown');

  const formattedLastModified = dbInfo.lastModified
    ? format.dateTime(new Date(dbInfo.lastModified), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
    : tCommon('unknown');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('title')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* DB Stats Cards */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('databaseMetricsTitle')}
          </h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200/50 w-full overflow-hidden">
            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">
                {t('managedAccounts')}
              </div>
              <div className="stat-value text-2xl font-black mt-1 text-primary">
                {accountsCount}
              </div>
              <div className="stat-desc mt-1">{t('accountsDesc')}</div>
            </div>

            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">
                {t('totalTransactions')}
              </div>
              <div className="stat-value text-2xl font-black mt-1 text-secondary">
                {transactionsCount}
              </div>
              <div className="stat-desc mt-1">{t('transactionsDesc')}</div>
            </div>

            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">
                {t('matchingRules')}
              </div>
              <div className="stat-value text-2xl font-black mt-1 text-accent">
                {rulesCount}
              </div>
              <div className="stat-desc mt-1">{t('rulesDesc')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App Preferences Card */}
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
              {/* Theme Selector */}
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="theme-select">
                  <span className="label-text text-xs font-bold text-base-content/75">
                    {t('themeLabel')}
                  </span>
                </label>
                <select
                  id="theme-select"
                  value={currentTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.id === 'night' ? t('themeDefault') : theme.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Currency */}
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="currency-select">
                  <span className="label-text text-xs font-bold text-base-content/75">
                    {t('currencyLabel')}
                  </span>
                </label>
                <select
                  id="currency-select"
                  value={defaultCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="AUD">{t('currencyOptionAud')}</option>
                  <option value="USD">{t('currencyOptionUsd')}</option>
                  <option value="EUR">{t('currencyOptionEur')}</option>
                  <option value="GBP">{t('currencyOptionGbp')}</option>
                  <option value="CAD">{t('currencyOptionCad')}</option>
                </select>
              </div>

              {/* Default range */}
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="range-select">
                  <span className="label-text text-xs font-bold text-base-content/75">
                    {t('dateRangeLabel')}
                  </span>
                </label>
                <select
                  id="range-select"
                  value={defaultRange}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="Month">{tReports('datePresets.month')}</option>
                  <option value="3m">{tReports('datePresets.threeMonths')}</option>
                  <option value="6m">{tReports('datePresets.sixMonths')}</option>
                  <option value="ytd">{tReports('datePresets.ytd')}</option>
                  <option value="12m">{tReports('datePresets.twelveMonths')}</option>
                </select>
              </div>

              {/* Date format */}
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="date-format-select">
                    <span className="label-text text-xs font-bold text-base-content/75">
                      {t('dateFormatLabel')}
                    </span>
                  </label>
                  <select
                    id="date-format-select"
                    value={dateFormat}
                    onChange={(e) => handleDateFormatChange(e.target.value)}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-06-09)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (09/06/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (06/09/2026)</option>
                  </select>
                </div>

                {/* Language */}
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-xs font-bold text-base-content/75">
                      {t('languageLabel')}
                    </span>
                  </label>
                  <select
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

        {/* Database Info Card */}
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body flex flex-col justify-between">
            <div>
              <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-primary" />
                {t('dbInfoTitle')}
              </h2>
              <p className="text-xs text-base-content/60 mb-4">
                {t('dbInfoDesc')}
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center border-b border-base-200/50 pb-2">
                  <span className="font-semibold text-base-content/60 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-primary" /> {t('dbSize')}
                  </span>
                  <span className="font-mono font-bold">{formattedFileSize}</span>
                </div>
                <div className="flex justify-between items-center border-b border-base-200/50 pb-2">
                  <span className="font-semibold text-base-content/60 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" /> {t('dbLastModified')}
                  </span>
                  <span className="font-semibold">{formattedLastModified}</span>
                </div>
                <div className="flex justify-between items-center border-b border-base-200/50 pb-2">
                  <span className="font-semibold text-base-content/60 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-primary" /> {t('dbSchemaVersion')}
                  </span>
                  <span className="font-mono font-bold text-xs max-w-[180px] truncate" title={dbInfo.schemaVersion}>
                    {dbInfo.schemaVersion.replace(/^\d+_(init_)?/, '') || dbInfo.schemaVersion}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="font-semibold text-base-content/60 flex items-center gap-1.5">
                    <HistoryIcon className="h-4 w-4 text-primary" /> {t('dbLastImport')}
                  </span>
                  <span className="font-semibold text-right">
                    {dbInfo.lastImportTimestamp
                      ? format.dateTime(new Date(dbInfo.lastImportTimestamp), {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                          second: 'numeric',
                        })
                      : t('dbNeverImported')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleVacuum}
                className="btn btn-outline btn-primary btn-sm w-full gap-2"
                disabled={isVacuuming || isPending}
              >
                {isVacuuming ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                )}
                {t('dbVacuumBtn')}
              </button>
              <label className="label mt-1">
                <span className="label-text-alt text-[10px] text-base-content/40 text-center w-full">
                  {t('dbVacuumDesc')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Export Card */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-1">
            <Download className="h-5 w-5 text-primary" />
            {t('exportTitle')}
          </h2>
          <p className="text-xs text-base-content/60">
            {t('exportDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleExportTransactions}
              className="btn btn-neutral btn-md gap-2"
              disabled={isExporting || isPending || transactionsCount === 0}
            >
              <FileSpreadsheet className="h-5 w-5 text-success" />
              {t('exportTransactionsBtn', { count: transactionsCount })}
            </button>

            <button
              onClick={handleExportAccounts}
              className="btn btn-neutral btn-md gap-2"
              disabled={isExporting || isPending || accountsCount === 0}
            >
              <FileSpreadsheet className="h-5 w-5 text-info" />
              {t('exportAccountsBtn', { count: accountsCount })}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="card bg-base-100 shadow-xl border border-error/20">
        <div className="card-body">
          <h2 className="card-title text-lg font-bold text-error flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-error" />
            {t('dangerZoneTitle')}
          </h2>
          <p className="text-sm text-base-content/70">
            {t('dangerZoneDesc')}
          </p>
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              {t('dbPathLabel')} <code className="bg-base-200 px-1.5 py-0.5 rounded font-mono">prisma/dev.db</code>
            </div>
            <button
              onClick={() => setShowWipeModal(true)}
              className="btn btn-error btn-md gap-2"
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              {t('wipeDbBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="wipe-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="wipe-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-error" />
              {t('wipeConfirmTitle')}
            </h3>
            
            <div className="py-4 text-sm text-base-content/80 space-y-3">
              <p>
                {t('wipeConfirmWarning')}
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 font-semibold text-error/95">
                <li>{t('wipeConfirmAccounts', { count: accountsCount })}</li>
                <li>{t('wipeConfirmTransactions', { count: transactionsCount })}</li>
                <li>{t('wipeConfirmRules', { count: rulesCount })}</li>
              </ul>
              <p>
                {t('wipeConfirmPermanent')}
              </p>
              <div className="form-control w-full pt-2">
                <label className="label py-1" htmlFor="wipe-confirm-input">
                  <span className="label-text-alt text-base-content/60">
                    {t.rich('wipeConfirmPrompt', {
                      word: (chunks) => <strong className="text-error">{chunks}</strong>
                    })}
                  </span>
                </label>
                <input
                  id="wipe-confirm-input"
                  type="text"
                  placeholder={t('wipeConfirmPlaceholder')}
                  value={wipeConfirmInput}
                  onChange={(e) => setWipeConfirmInput(e.target.value)}
                  className="input input-bordered input-sm w-full font-bold uppercase"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="btn btn-ghost btn-sm"
                disabled={isPending}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetDbConfirm}
                className="btn btn-error btn-sm gap-2"
                disabled={isPending || wipeConfirmInput !== 'WIPE'}
              >
                {isPending && <span className="loading loading-spinner loading-xs"></span>}
                {isPending ? t('wiping') : t('wipeAllBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Notification Container */}
      <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert shadow-lg text-xs font-semibold ${
              t.type === 'error' ? 'alert-error text-error-content' : 'alert-success text-success-content'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
