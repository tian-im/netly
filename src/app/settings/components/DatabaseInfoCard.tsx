import { useState } from 'react';
import { Database, Clock, Settings, History as HistoryIcon, RefreshCw } from 'lucide-react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { vacuumDatabase } from '../../actions';

interface DatabaseInfoCardProps {
  dbInfo: {
    fileSize: number;
    lastModified: string;
    schemaVersion: string;
    lastImportTimestamp: string | null;
  };
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function DatabaseInfoCard({ dbInfo, showToast }: DatabaseInfoCardProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const router = useRouter();
  const [isVacuuming, setIsVacuuming] = useState(false);

  const handleVacuum = async () => {
    setIsVacuuming(true);
    try {
      await vacuumDatabase();
      showToast(t('dbVacuumSuccess'));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('dbVacuumFailed'), 'error');
    } finally {
      setIsVacuuming(false);
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
            disabled={isVacuuming}
          >
            {isVacuuming ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin" />
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
  );
}
