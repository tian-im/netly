'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PassKeyInfo, McpTokenInfo } from '@/types/settings';
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
}

export default function SettingsClient({
  accountsCount,
  transactionsCount,
  rulesCount,
  dbInfo,
  passKeys,
  initialMcpTokens,
}: SettingsClientProps) {
  const t = useTranslations('settings');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
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

      {/* PassKey Management Card */}
      <PassKeySection initialPassKeys={passKeys} showToast={showToast} />

      {/* MCP Access Card */}
      <McpSection initialMcpTokens={initialMcpTokens} showToast={showToast} />

      {/* DB Stats Cards */}
      <DatabaseMetricsCard
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        rulesCount={rulesCount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App Preferences Card */}
        <PreferencesCard showToast={showToast} />

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
