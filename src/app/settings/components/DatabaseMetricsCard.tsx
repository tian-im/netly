import { BarChart3, Calendar } from 'lucide-react';
import { useTranslations, useFormatter } from 'next-intl';
import Link from 'next/link';
import { buildAccountsUrl, buildTransactionsUrl, buildCategoriesUrl } from '@/lib/links';

interface DatabaseMetricsCardProps {
  accountsCount: number;
  transactionsCount: number;
  rulesCount: number;
  earliestTxDate: string | null;
  latestTxDate: string | null;
}

export default function DatabaseMetricsCard({
  accountsCount,
  transactionsCount,
  rulesCount,
  earliestTxDate,
  latestTxDate,
}: DatabaseMetricsCardProps) {
  const t = useTranslations('settings');
  const format = useFormatter();

  const formattedDateRange = (() => {
    if (!earliestTxDate || !latestTxDate) {
      return t('noDataRange');
    }
    const start = format.dateTime(new Date(earliestTxDate), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const end = format.dateTime(new Date(latestTxDate), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return t('dbDataRange', { start, end });
  })();

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('databaseMetricsTitle')}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-base-content/60 bg-base-200 px-2.5 py-1 rounded-full w-fit">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDateRange}</span>
          </div>
        </div>

        <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200/50 w-full overflow-hidden">
          <Link
            href={buildAccountsUrl()}
            className="stat hover:bg-base-200 transition-colors duration-200 cursor-pointer group animate-fade-in"
          >
            <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60 group-hover:text-primary transition-colors">
              {t('managedAccounts')}
            </div>
            <div className="stat-value text-2xl font-black mt-1 text-primary">
              {accountsCount}
            </div>
            <div className="stat-desc mt-1 group-hover:text-base-content/85 transition-colors">{t('accountsDesc')}</div>
          </Link>

          <Link
            href={buildTransactionsUrl()}
            className="stat hover:bg-base-200 transition-colors duration-200 cursor-pointer group animate-fade-in"
          >
            <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60 group-hover:text-secondary transition-colors">
              {t('totalTransactions')}
            </div>
            <div className="stat-value text-2xl font-black mt-1 text-secondary">
              {transactionsCount}
            </div>
            <div className="stat-desc mt-1 group-hover:text-base-content/85 transition-colors">{t('transactionsDesc')}</div>
          </Link>

          <Link
            href={`${buildCategoriesUrl()}?tab=rules`}
            className="stat hover:bg-base-200 transition-colors duration-200 cursor-pointer group animate-fade-in"
          >
            <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60 group-hover:text-accent transition-colors">
              {t('matchingRules')}
            </div>
            <div className="stat-value text-2xl font-black mt-1 text-accent">
              {rulesCount}
            </div>
            <div className="stat-desc mt-1 group-hover:text-base-content/85 transition-colors">{t('rulesDesc')}</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
