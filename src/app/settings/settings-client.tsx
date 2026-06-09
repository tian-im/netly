'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { useLocaleContext } from '../providers';
import { translateError } from '@/lib/translateError';
import { startRegistration } from '@simplewebauthn/browser';
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
  Settings,
  ShieldAlert,
  History as HistoryIcon,
  KeyRound,
  Plus,
  LogOut,
  Copy,
  Bot,
} from 'lucide-react';

interface PassKeyInfo {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

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
  passKeys: PassKeyInfo[];
  initialMcpTokens: McpTokenInfo[];
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
  passKeys: initialPassKeys,
  initialMcpTokens,
}: SettingsClientProps) {
  const router = useRouter();
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tReports = useTranslations('reports');
  const tPasskey = useTranslations('passkey.settings');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [defaultCurrency, setDefaultCurrency] = useState('AUD');
  const [defaultRange, setDefaultRange] = useState('Month');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [currentTheme, setCurrentTheme] = useState('night');

  const [passKeys, setPassKeys] = useState<PassKeyInfo[]>(initialPassKeys);
  const [isAddingPassKey, setIsAddingPassKey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showAddPassKeyModal, setShowAddPassKeyModal] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<{ token: string; url: string; expiresAt: number } | null>(null);
  const [showSetupTokenModal, setShowSetupTokenModal] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [mcpTokens, setMcpTokens] = useState<McpTokenInfo[]>(initialMcpTokens);
  const [showAddMcpModal, setShowAddMcpModal] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [isCreatingMcpToken, setIsCreatingMcpToken] = useState(false);
  const [generatedMcpToken, setGeneratedMcpToken] = useState<{ token: string; name: string } | null>(null);
  const [copiedMcpToken, setCopiedMcpToken] = useState(false);
  const [isRevokingMcpId, setIsRevokingMcpId] = useState<string | null>(null);

  useEffect(() => {
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

  const handleAddPassKey = async () => {
    if (!newDeviceName.trim()) return;

    setIsAddingPassKey(true);
    try {
      const beginRes = await fetch('/api/auth/register/begin', { method: 'POST' });
      if (!beginRes.ok) {
        throw new Error('ERR_UNKNOWN');
      }

      const options = await beginRes.json();
      const { state, ...regOptions } = options;

      const regResponse = await startRegistration(regOptions);

      const completeRes = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, deviceName: newDeviceName.trim(), ...regResponse }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error);
      }

      setShowAddPassKeyModal(false);
      setNewDeviceName('');
      showToast(tPasskey('addedSuccess'));

      const credRes = await fetch('/api/auth/credentials');
      if (credRes.ok) {
        setPassKeys(await credRes.json());
      } else {
        router.refresh();
      }
    } catch (err: any) {
      showToast(tErrors(translateError(err.message)), 'error');
    } finally {
      setIsAddingPassKey(false);
    }
  };

  const handleGenerateSetupToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await fetch('/api/auth/setup-token/generate', { method: 'POST' });
      if (!res.ok) {
        throw new Error('ERR_UNKNOWN');
      }
      const data = await res.json();
      setSetupToken(data);
      setShowSetupTokenModal(true);
      setCopiedToken(false);
      setCopiedUrl(false);
    } catch (err: any) {
      showToast(tErrors(translateError(err.message)), 'error');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleDeletePassKey = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch('/api/auth/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setPassKeys((prev) => prev.filter((pk) => pk.id !== id));
      showToast(tPasskey('removedSuccess'));
    } catch (err: any) {
      showToast(tErrors(translateError(err.message)), 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCreateMcpToken = async () => {
    if (!newMcpName.trim()) return;
    setIsCreatingMcpToken(true);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMcpName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ERR_UNKNOWN');
      }
      const data = await res.json();
      setGeneratedMcpToken({ token: data.token, name: data.name });
      showToast(t('mcpCreatedSuccess'));

      const tokensRes = await fetch('/api/mcp/tokens');
      if (tokensRes.ok) {
        setMcpTokens(await tokensRes.json());
      }
    } catch (err: any) {
      showToast(tErrors(translateError(err.message)) || t('mcpCreateFailed'), 'error');
    } finally {
      setIsCreatingMcpToken(false);
    }
  };

  const handleRevokeMcpToken = async (id: string) => {
    setIsRevokingMcpId(id);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ERR_UNKNOWN');
      }
      setMcpTokens((prev) => prev.filter((t) => t.id !== id));
      showToast(t('mcpRevokedSuccess'));
    } catch (err: any) {
      showToast(tErrors(translateError(err.message)) || t('mcpRevokeFailed'), 'error');
    } finally {
      setIsRevokingMcpId(null);
    }
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

      {/* PassKey Management Card */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {tPasskey('title')}
          </h2>
          <p className="text-xs text-base-content/60 mb-4">
            {tPasskey('desc')}
          </p>

          <div className="space-y-2">
            {passKeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {pk.deviceName || tPasskey('unnamed')}
                    </p>
                    <p className="text-xs text-base-content/40">
                      {tPasskey('added')} {format.dateTime(new Date(pk.createdAt), { dateStyle: 'medium' })}
                      {pk.lastUsedAt && ` · ${tPasskey('lastUsed')} ${format.dateTime(new Date(pk.lastUsedAt), { dateStyle: 'medium' })}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePassKey(pk.id)}
                  disabled={isDeletingId === pk.id || passKeys.length <= 1}
                  className="btn btn-ghost btn-xs text-error gap-1"
                  title={passKeys.length <= 1 ? tPasskey('cannotRemoveLast') : tPasskey('remove')}
                >
                  {isDeletingId === pk.id ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {passKeys.length === 0 && (
            <p className="text-sm text-base-content/40 text-center py-4">
              {tPasskey('noPasskeys')}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setShowAddPassKeyModal(true)}
              className="btn btn-outline btn-primary btn-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              {tPasskey('addBtn')}
            </button>
            <button
              onClick={handleGenerateSetupToken}
              disabled={isGeneratingToken}
              className="btn btn-outline btn-secondary btn-sm gap-2"
            >
              {isGeneratingToken ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {tPasskey('addDeviceBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* MCP Access Card */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
            <Bot className="h-5 w-5 text-primary" />
            {t('mcpTitle')}
          </h2>
          <p className="text-xs text-base-content/60 mb-4">
            {t('mcpDesc')}
          </p>

          {mcpTokens.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">
                {t('mcpActiveTokens')}
              </h3>
              <div className="space-y-2">
                {mcpTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">
                          {token.name}
                        </p>
                        <p className="text-xs text-base-content/40">
                          {token.lastUsedAt
                            ? t('mcpLastUsed', {
                                date: format.dateTime(new Date(token.lastUsedAt), {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                }),
                              })
                            : t('mcpNeverUsed')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeMcpToken(token.id)}
                      disabled={isRevokingMcpId === token.id}
                      className="btn btn-ghost btn-xs text-error gap-1"
                      title={t('mcpRevokeBtn')}
                    >
                      {isRevokingMcpId === token.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mcpTokens.length === 0 && (
            <p className="text-sm text-base-content/40 text-center py-4 border border-dashed border-base-300 rounded-lg mb-4">
              {t('mcpNoTokens')}
            </p>
          )}

          <div>
            <button
              onClick={() => {
                setGeneratedMcpToken(null);
                setNewMcpName('');
                setShowAddMcpModal(true);
              }}
              className="btn btn-outline btn-primary btn-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('mcpCreateBtn')}
            </button>
          </div>
        </div>
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
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              <LogOut className="h-4 w-4 inline mr-1" />
              Sign out of your account
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-outline btn-sm gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Add PassKey Modal */}
      {showAddPassKeyModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {tPasskey('modalTitle')}
            </h3>
            <div className="py-4 space-y-3">
              <p className="text-sm text-base-content/80">
                {tPasskey('modalDesc')}
              </p>
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="new-passkey-name">
                  <span className="label-text font-semibold text-base-content/75">
                    {tPasskey('deviceName')}
                  </span>
                </label>
                <input
                  id="new-passkey-name"
                  type="text"
                  placeholder={tPasskey('deviceNamePlaceholder')}
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="input input-bordered w-full"
                  disabled={isAddingPassKey}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowAddPassKeyModal(false);
                  setNewDeviceName('');
                }}
                className="btn btn-ghost btn-sm"
                disabled={isAddingPassKey}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddPassKey}
                className="btn btn-primary btn-sm gap-2"
                disabled={isAddingPassKey || !newDeviceName.trim()}
              >
                {isAddingPassKey ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isAddingPassKey ? tPasskey('registering') : tPasskey('registerBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Token Modal */}
      {showSetupTokenModal && setupToken && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {tPasskey('setupTokenModalTitle')}
            </h3>
            <div className="py-4 space-y-4">
              <p className="text-sm text-base-content/80">
                {tPasskey('setupTokenModalDesc')}
              </p>

              <div className="space-y-3">
                {/* Code field */}
                <div className="form-control w-full">
                  <span className="label-text font-semibold text-base-content/75 mb-1">
                    {tPasskey('setupTokenLabel')}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={setupToken.token}
                      className="input input-bordered font-mono font-bold text-center tracking-wider w-full text-lg bg-base-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setupToken.token);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="btn btn-primary btn-square"
                      title={tPasskey('copyBtn')}
                    >
                      {copiedToken ? (
                        <span className="text-xs font-bold">{tPasskey('copiedSuccess')}</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* URL field */}
                <div className="form-control w-full">
                  <span className="label-text font-semibold text-base-content/75 mb-1">
                    {tPasskey('setupUrlLabel')}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={setupToken.url}
                      className="input input-bordered text-xs w-full bg-base-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setupToken.url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="btn btn-primary btn-square"
                      title={tPasskey('copyBtn')}
                    >
                      {copiedUrl ? (
                        <span className="text-xs font-bold">{tPasskey('copiedSuccess')}</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning text-xs mt-2 gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning-content" />
                <span className="text-warning-content font-semibold">{tPasskey('setupTokenExpires')}</span>
              </div>
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowSetupTokenModal(false);
                  setSetupToken(null);
                }}
                className="btn btn-sm"
              >
                {tCommon('close')}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Add/Generate MCP Token Modal */}
      {showAddMcpModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="mcp-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="mcp-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {generatedMcpToken ? t('mcpCreatedTitle') : t('mcpCreateBtn')}
            </h3>
            
            <div className="py-4 space-y-4">
              {!generatedMcpToken ? (
                <div className="form-control w-full">
                  <label className="label py-1" htmlFor="new-mcp-name">
                    <span className="label-text font-semibold text-base-content/75">
                      {t('mcpNameLabel')}
                    </span>
                  </label>
                  <input
                    id="new-mcp-name"
                    type="text"
                    placeholder={t('mcpNamePlaceholder')}
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    className="input input-bordered w-full"
                    disabled={isCreatingMcpToken}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="alert alert-success text-xs gap-2">
                    <span>{t('mcpCreatedDesc')}</span>
                  </div>
                  
                  <div className="form-control w-full">
                    <span className="label-text font-semibold text-base-content/75 mb-1">
                      {t('mcpTokenLabel')}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedMcpToken.token}
                        className="input input-bordered font-mono font-bold text-center w-full text-sm bg-base-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedMcpToken.token);
                          setCopiedMcpToken(true);
                          setTimeout(() => setCopiedMcpToken(false), 2000);
                        }}
                        className="btn btn-primary btn-square"
                        title={tCommon('copy')}
                      >
                        {copiedMcpToken ? (
                          <span className="text-xs font-bold">{tPasskey('copiedSuccess')}</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-base-content/60 leading-relaxed pt-2">
                    {t('mcpInstruction')}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-action">
              {!generatedMcpToken ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMcpModal(false);
                      setNewMcpName('');
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={isCreatingMcpToken}
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateMcpToken}
                    className="btn btn-primary btn-sm gap-2"
                    disabled={isCreatingMcpToken || !newMcpName.trim()}
                  >
                    {isCreatingMcpToken ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {t('mcpCreateBtn')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMcpModal(false);
                    setGeneratedMcpToken(null);
                    setNewMcpName('');
                  }}
                  className="btn btn-sm"
                >
                  {tCommon('close')}
                </button>
              )}
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
