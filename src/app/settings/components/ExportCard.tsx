import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { exportAllTransactions, exportAllAccounts } from '../../actions';
import { formatDateISO } from '@/lib/dates';
import { Button } from '@/app/components/ui';

interface ExportCardProps {
  accountsCount: number;
  transactionsCount: number;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function ExportCard({ accountsCount, transactionsCount, showToast }: ExportCardProps) {
  const t = useTranslations('settings');
  const [isExportingTransactions, setIsExportingTransactions] = useState(false);
  const [isExportingAccounts, setIsExportingAccounts] = useState(false);

  const handleExportTransactions = async () => {
    setIsExportingTransactions(true);
    try {
      const txs = await exportAllTransactions();
      const { generateLedgerCSV, downloadCSV } = await import('@/lib/csv-export');
      const csvContent = generateLedgerCSV(txs);
      downloadCSV(csvContent, `netly_transactions_${formatDateISO()}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('exportFailed'), 'error');
    } finally {
      setIsExportingTransactions(false);
    }
  };

  const handleExportAccounts = async () => {
    setIsExportingAccounts(true);
    try {
      const accs = await exportAllAccounts();
      const { generateAccountCSV, downloadCSV } = await import('@/lib/csv-export');
      const csvContent = generateAccountCSV(accs);
      downloadCSV(csvContent, `netly_accounts_${formatDateISO()}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('exportFailed'), 'error');
    } finally {
      setIsExportingAccounts(false);
    }
  };

  return (
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
          <Button
            onClick={handleExportTransactions}
            size="md"
            disabled={transactionsCount === 0}
            loading={isExportingTransactions}
            icon={<FileSpreadsheet className="h-5 w-5" />}
            aria-label={t('exportTransactionsBtn', { count: transactionsCount })}
          >
            {t('exportTransactionsBtn', { count: transactionsCount })}
          </Button>

          <Button
            onClick={handleExportAccounts}
            size="md"
            disabled={accountsCount === 0}
            loading={isExportingAccounts}
            icon={<FileSpreadsheet className="h-5 w-5" />}
            aria-label={t('exportAccountsBtn', { count: accountsCount })}
          >
            {t('exportAccountsBtn', { count: accountsCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}
