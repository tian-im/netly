import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { exportAllTransactions, exportAllAccounts } from '../../actions';
import { formatDateISO } from '@/lib/dates';

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
          <button
            onClick={handleExportTransactions}
            className="btn btn-neutral btn-md gap-2"
            disabled={isExportingTransactions || transactionsCount === 0}
            aria-label={t('exportTransactionsBtn', { count: transactionsCount })}
          >
            {isExportingTransactions ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <FileSpreadsheet className="h-5 w-5 text-success" />
            )}
            {t('exportTransactionsBtn', { count: transactionsCount })}
          </button>

          <button
            onClick={handleExportAccounts}
            className="btn btn-neutral btn-md gap-2"
            disabled={isExportingAccounts || accountsCount === 0}
            aria-label={t('exportAccountsBtn', { count: accountsCount })}
          >
            {isExportingAccounts ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <FileSpreadsheet className="h-5 w-5 text-info" />
            )}
            {t('exportAccountsBtn', { count: accountsCount })}
          </button>
        </div>
      </div>
    </div>
  );
}
