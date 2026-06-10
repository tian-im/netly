import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DatabaseMetricsCardProps {
  accountsCount: number;
  transactionsCount: number;
  rulesCount: number;
}

export default function DatabaseMetricsCard({
  accountsCount,
  transactionsCount,
  rulesCount,
}: DatabaseMetricsCardProps) {
  const t = useTranslations('settings');

  return (
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
  );
}
