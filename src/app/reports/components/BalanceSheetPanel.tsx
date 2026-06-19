'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleContext } from '@/app/providers';
import { BalanceSheet } from '../types';
import { Scale, Search } from 'lucide-react';
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';
import { RenderDelta } from '@/lib/render-delta';
import { Button } from '@/app/components/ui';

interface BalanceSheetPanelProps {
  report: BalanceSheet;
  comparisonReport: BalanceSheet | null;
  currency: string;
  onDrillDown: (title: string, options: { accountId: string }) => void;
}

export default function BalanceSheetPanel({
  report,
  comparisonReport,
  currency,
  onDrillDown,
}: BalanceSheetPanelProps) {
  const t = useTranslations('reports');
  const { locale } = useLocaleContext();
  const totals = report.totals[currency] || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  const priorTotals = comparisonReport?.totals[currency] || null;
  const symbol = getCurrencySymbol(currency);

  // Filter accounts by type and currency (Optimized with useMemo)
  const bsAccounts = useMemo(() => {
    return report.accounts.filter((a) => (a.currency || DEFAULT_CURRENCY) === currency);
  }, [report.accounts, currency]);

  const assetAccounts = useMemo(() => {
    return bsAccounts.filter((a) => a.type === 'ASSET');
  }, [bsAccounts]);

  const liabilityAccounts = useMemo(() => {
    return bsAccounts.filter((a) => a.type === 'LIABILITY');
  }, [bsAccounts]);

  // Find corresponding account balance in prior report
  const getPriorBalance = (accountId: string): number => {
    if (!comparisonReport) return 0;
    const priorAcc = comparisonReport.accounts.find((a) => a.id === accountId);
    return priorAcc ? priorAcc.balance : 0;
  };

  // Visual proportions split
  const assetRatio = useMemo(() => {
    const total = totals.totalAssets + totals.totalLiabilities;
    if (total === 0) return 50;
    return (totals.totalAssets / total) * 100;
  }, [totals]);

  const liabilityRatio = 100 - assetRatio;

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
      <input type="radio" name="reports-accordion" defaultChecked /> 
      <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
        <span className="flex items-center gap-2">
          <Scale className="h-5 w-5" /> {t('balanceSheet.title')} ({currency})
        </span>
        <span className="text-sm font-semibold opacity-60">
          {t('balanceSheet.netWorth')}: {symbol}{totals.netWorth.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {priorTotals && (
            <span className="ml-2 pl-2 border-l border-base-300 text-xs text-base-content/50">
              {t('balanceSheet.prior')}{symbol}{priorTotals.netWorth.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </span>
          )}
        </span>
      </div>
      <div className="collapse-content px-6 pb-6">
        <div className="divider my-0"></div>

        {/* Visual CSS Proportions Split Bar */}
        {(totals.totalAssets > 0 || totals.totalLiabilities > 0) && (
          <div className="mt-4 mb-6">
            <div className="flex justify-between text-xs font-bold mb-1 opacity-70">
              <span>{t('balanceSheet.assets')} ({assetRatio.toFixed(0)}%)</span>
              <span>{t('balanceSheet.liabilities')} ({liabilityRatio.toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-base-200 h-3 rounded-full overflow-hidden flex">
              <div className="bg-success h-full transition-all" style={{ width: `${assetRatio}%` }}></div>
              <div className="bg-error h-full transition-all" style={{ width: `${liabilityRatio}%` }}></div>
            </div>
            <div className="text-[10px] text-base-content/40 mt-1 text-center">
              {t('balanceSheet.debtToAssetRatio', {
                ratio: ((totals.totalLiabilities / Math.max(1, totals.totalAssets)) * 100).toFixed(1)
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Assets Column */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-primary/20 pb-2 mb-3">
              {t('balanceSheet.assetsDesc')}
            </h3>
            <div className="space-y-3">
              {assetAccounts.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">{t('balanceSheet.noAssets', { currency })}</div>
              ) : (
                assetAccounts.map((acc) => {
                  const priorVal = getPriorBalance(acc.id);
                  return (
                    <div key={acc.id} className="flex justify-between items-center text-sm">
                      <Button
                        variant="link"
                        size="xs"
                        onClick={() => onDrillDown(acc.name, { accountId: acc.id })}
                        className="font-medium"
                      >
                        {acc.name} <Search className="h-3 w-3 opacity-60" />
                      </Button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-success">
                          {symbol}{acc.balance.toLocaleString(locale, { minimumFractionDigits: 2 })}
                        </span>
                        <RenderDelta current={acc.balance} prior={priorVal} showDelta={!!comparisonReport} locale={locale} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>{t('balanceSheet.totalAssets')}</span>
                <div className="flex flex-col items-end">
                  <span className="text-success">{symbol}{totals.totalAssets.toLocaleString(locale, { minimumFractionDigits: 2 })}</span>
                  <RenderDelta current={totals.totalAssets} prior={priorTotals ? priorTotals.totalAssets : 0} showDelta={!!comparisonReport} locale={locale} />
                </div>
              </div>
            </div>
          </div>

          {/* Liabilities Column */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-secondary border-b border-secondary/20 pb-2 mb-3">
              {t('balanceSheet.liabilitiesDesc')}
            </h3>
            <div className="space-y-3">
              {liabilityAccounts.length === 0 ? (
                <div className="text-xs text-base-content/40 py-2">{t('balanceSheet.noLiabilities', { currency })}</div>
              ) : (
                liabilityAccounts.map((acc) => {
                  const priorVal = getPriorBalance(acc.id);
                  return (
                    <div key={acc.id} className="flex justify-between items-center text-sm">
                      <Button
                        variant="link"
                        size="xs"
                        onClick={() => onDrillDown(acc.name, { accountId: acc.id })}
                        className="font-medium"
                      >
                        {acc.name} <Search className="h-3 w-3 opacity-60" />
                      </Button>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-semibold text-error">
                          {symbol}{acc.balance.toLocaleString(locale, { minimumFractionDigits: 2 })}
                        </span>
                        <RenderDelta current={acc.balance} prior={priorVal} showDelta={!!comparisonReport} reverseImpact={true} locale={locale} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-between items-start font-bold text-sm border-t border-base-300 pt-3 mt-3">
                <span>{t('balanceSheet.totalLiabilities')}</span>
                <div className="flex flex-col items-end">
                  <span className="text-error">{symbol}{totals.totalLiabilities.toLocaleString(locale, { minimumFractionDigits: 2 })}</span>
                  <RenderDelta current={totals.totalLiabilities} prior={priorTotals ? priorTotals.totalLiabilities : 0} showDelta={!!comparisonReport} reverseImpact={true} locale={locale} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
          <span className="font-extrabold text-md">{t('balanceSheet.netWorthTotal')}</span>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-extrabold text-xl ${totals.netWorth >= 0 ? 'text-success' : 'text-error'}`}>
              {symbol}{totals.netWorth.toLocaleString(locale, { minimumFractionDigits: 2 })} {currency}
            </span>
            <RenderDelta current={totals.netWorth} prior={priorTotals ? priorTotals.netWorth : 0} showDelta={!!comparisonReport} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
