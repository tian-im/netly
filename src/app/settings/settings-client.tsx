'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PassKeyInfo, McpTokenInfo } from '@/types/settings';
import { Sparkles } from 'lucide-react';
import { buildAccountsUrl, buildImportUrl } from '@/lib/links';
import PassKeySection from './components/PassKeySection';
import McpSection from './components/McpSection';
import PreferencesCard from './components/PreferencesCard';
import DatabaseInfoCard from './components/DatabaseInfoCard';
import ExportCard from './components/ExportCard';
import DangerZoneCard from './components/DangerZoneCard';
import DatabaseMetricsCard from './components/DatabaseMetricsCard';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
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
  earliestTxDate: string | null;
  latestTxDate: string | null;
  initialPreferences?: {
    defaultCurrency?: string;
    dateRange?: string;
    dateFormat?: string;
    ruleMode?: string;
  };
}

export default function SettingsClient({
  accountsCount,
  transactionsCount,
  rulesCount,
  dbInfo,
  passKeys,
  initialMcpTokens,
  earliestTxDate,
  latestTxDate,
  initialPreferences,
}: SettingsClientProps) {
  const t = useTranslations('settings');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toastIdRef.current += 1;
    const id = `toast-${toastIdRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

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

      {/* Onboarding Empty State Banners */}
      {accountsCount === 0 && (
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 shadow-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
          <div>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
              {t('getStartedTitle')}
            </h3>
            <p className="text-sm text-base-content/80 mt-1">
              {t('getStartedCreateAccount')}
            </p>
          </div>
          <Link href={buildAccountsUrl()} className="btn btn-primary btn-sm whitespace-nowrap shadow-md hover:shadow-lg transition-shadow">
            {t('goToAccounts')}
          </Link>
        </div>
      )}

      {accountsCount > 0 && transactionsCount === 0 && (
        <div className="card bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/20 shadow-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
          <div>
            <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary shrink-0 animate-pulse" />
              {t('getStartedTitle')}
            </h3>
            <p className="text-sm text-base-content/80 mt-1">
              {t('getStartedImport')}
            </p>
          </div>
          <Link href={buildImportUrl()} className="btn btn-secondary btn-sm whitespace-nowrap shadow-md hover:shadow-lg transition-shadow">
            {t('goToImport')}
          </Link>
        </div>
      )}

      {/* PassKey Management Card */}
      <PassKeySection initialPassKeys={passKeys} showToast={showToast} />

      {/* MCP Access Card */}
      <McpSection initialMcpTokens={initialMcpTokens} showToast={showToast} />

      {/* DB Stats Cards */}
      <DatabaseMetricsCard
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        rulesCount={rulesCount}
        earliestTxDate={earliestTxDate}
        latestTxDate={latestTxDate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App Preferences Card */}
        <PreferencesCard showToast={showToast} initialPreferences={initialPreferences} />

        {/* Database Info Card */}
        <DatabaseInfoCard dbInfo={dbInfo} showToast={showToast} />
      </div>

      {/* Backup & Export Card */}
      <ExportCard
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        showToast={showToast}
      />

      {/* Danger Zone Card */}
      <DangerZoneCard
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        rulesCount={rulesCount}
        showToast={showToast}
      />

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
