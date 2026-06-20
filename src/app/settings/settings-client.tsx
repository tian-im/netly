'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import SupportCard from './components/SupportCard';
import { ToastContainer, Card, Button, type ToastMessage } from '@/app/components/ui';


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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
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
        <Card className="border-l-4 border-l-primary">
          <Card.Body className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                {t('getStartedTitle')}
              </h3>
              <p className="text-sm text-base-content/70 mt-1">
                {t('getStartedCreateAccount')}
              </p>
            </div>
            <Button href={buildAccountsUrl()} size="sm" className="whitespace-nowrap">
              {t('goToAccounts')}
            </Button>
          </Card.Body>
        </Card>
      )}

      {accountsCount > 0 && transactionsCount === 0 && (
        <Card className="border-l-4 border-l-secondary">
          <Card.Body className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary shrink-0 animate-pulse" />
                {t('getStartedTitle')}
              </h3>
              <p className="text-sm text-base-content/70 mt-1">
                {t('getStartedImport')}
              </p>
            </div>
            <Button href={buildImportUrl()} variant="secondary" size="sm" className="whitespace-nowrap">
              {t('goToImport')}
            </Button>
          </Card.Body>
        </Card>
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

      {/* Support Card — warm, positive card placed before DangerZone */}
      <SupportCard />

      {/* Danger Zone Card */}
      <DangerZoneCard
        accountsCount={accountsCount}
        transactionsCount={transactionsCount}
        rulesCount={rulesCount}
        showToast={showToast}
      />

      {/* Toasts Notification Container */}
      <ToastContainer
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
