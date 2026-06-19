'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleContext } from '@/app/providers';
import { CashFlowStatement, CashFlowSection } from '../types';
import { ArrowDownRight, Search } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';
import { RenderDelta } from '@/lib/render-delta';
import { Button } from '@/app/components/ui';

// WHY: Extracted as a named sub-component (instead of an inline closure) so that
// React can skip re-rendering sections whose props haven't changed. An inline closure
// would be recreated on every render of the parent, forcing all three sections to
// re-render even if their data is identical.
const CashFlowSectionBlock = memo(function CashFlowSectionBlock({
  title,
  sectionName,
  data,
  comparisonReport,
  priorData,
  symbol,
  locale,
  onDrillDown,
  t,
}: {
  title: string;
  sectionName: 'operating' | 'investing' | 'financing';
  data: CashFlowSection;
  comparisonReport: CashFlowStatement | null;
  priorData: CashFlowSection | null;
  symbol: string;
  locale: string;
  onDrillDown: (
    title: string,
    options: { cashFlowSection: 'operating' | 'investing' | 'financing'; cashFlowType: 'inflow' | 'outflow' }
  ) => void;
  t: (key: string, params?: any) => string;
}) {
  return (
    <div className="bg-base-200/40 p-5 rounded-xl border border-base-300/40">
      <div className="flex justify-between items-center font-bold text-sm border-b border-base-300 pb-2 mb-3">
        <span>{title}</span>
        <div className="flex flex-col items-end">
          <span className={data.net >= 0 ? 'text-success' : 'text-error'}>
            {symbol}{data.net.toLocaleString(locale, { minimumFractionDigits: 2 })}
          </span>
          <RenderDelta current={data.net} prior={priorData ? priorData.net : 0} showDelta={!!comparisonReport} locale={locale} />
        </div>
      </div>

      <div className="space-y-2 text-xs px-2 text-base-content/75">
        {/* Inflow row */}
        <div className="flex justify-between items-start">
          <Button
            variant="link"
            size="xs"
            onClick={() => onDrillDown(`${title} (${t('cashFlow.inflow')})`, { cashFlowSection: sectionName, cashFlowType: 'inflow' })}
            className="font-medium"
          >
            {t('cashFlow.inflowsLabel')} <Search className="h-3 w-3 opacity-60" />
          </Button>
          <div className="flex flex-col items-end">
            <span className="text-success font-semibold">
              +{symbol}{data.inflow.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </span>
            <RenderDelta current={data.inflow} prior={priorData ? priorData.inflow : 0} showDelta={!!comparisonReport} locale={locale} />
          </div>
        </div>

        {/* Outflow row */}
        <div className="flex justify-between items-start">
          <Button
            variant="link"
            size="xs"
            onClick={() => onDrillDown(`${title} (${t('cashFlow.outflow')})`, { cashFlowSection: sectionName, cashFlowType: 'outflow' })}
            className="font-medium"
          >
            {t('cashFlow.outflowsLabel')} <Search className="h-3 w-3 opacity-60" />
          </Button>
          <div className="flex flex-col items-end">
            <span className="text-error font-semibold">
              -{symbol}{data.outflow.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </span>
            <RenderDelta current={data.outflow} prior={priorData ? priorData.outflow : 0} showDelta={!!comparisonReport} reverseImpact={true} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
});

interface CashFlowPanelProps {
  report: CashFlowStatement;
  comparisonReport: CashFlowStatement | null;
  currency: string;
  onDrillDown: (
    title: string,
    options: { cashFlowSection: 'operating' | 'investing' | 'financing'; cashFlowType: 'inflow' | 'outflow' }
  ) => void;
}

export default function CashFlowPanel({
  report,
  comparisonReport,
  currency,
  onDrillDown,
}: CashFlowPanelProps) {
  const t = useTranslations('reports');
  const { locale } = useLocaleContext();
  const totals = report.totals[currency] || {
    operating: { inflow: 0, outflow: 0, net: 0 },
    investing: { inflow: 0, outflow: 0, net: 0 },
    financing: { inflow: 0, outflow: 0, net: 0 },
    netCashFlow: 0,
  };

  const priorTotals = comparisonReport?.totals[currency] || null;
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
      <input type="radio" name="reports-accordion" /> 
      <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
        <span className="flex items-center gap-2">
          <ArrowDownRight className="h-5 w-5" /> {t('cashFlow.title')} ({currency})
        </span>
        <span className="text-sm font-semibold opacity-60">
          {t('cashFlow.netCashFlowLabel')}: {symbol}{totals.netCashFlow.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {priorTotals && (
            <span className="ml-2 pl-2 border-l border-base-300 text-xs text-base-content/50">
              {t('cashFlow.priorLabel')}: {symbol}{priorTotals.netCashFlow.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </span>
          )}
        </span>
      </div>
      <div className="collapse-content px-6 pb-6">
        <div className="divider my-0"></div>

        <div className="space-y-6 mt-4">
          <CashFlowSectionBlock
            title={t('cashFlow.operatingActivitiesTitle')}
            sectionName="operating"
            data={totals.operating}
            comparisonReport={comparisonReport}
            priorData={priorTotals?.operating || null}
            symbol={symbol}
            locale={locale}
            onDrillDown={onDrillDown}
            t={t}
          />
          <CashFlowSectionBlock
            title={t('cashFlow.investingActivitiesTitle')}
            sectionName="investing"
            data={totals.investing}
            comparisonReport={comparisonReport}
            priorData={priorTotals?.investing || null}
            symbol={symbol}
            locale={locale}
            onDrillDown={onDrillDown}
            t={t}
          />
          <CashFlowSectionBlock
            title={t('cashFlow.financingActivitiesTitle')}
            sectionName="financing"
            data={totals.financing}
            comparisonReport={comparisonReport}
            priorData={priorTotals?.financing || null}
            symbol={symbol}
            locale={locale}
            onDrillDown={onDrillDown}
            t={t}
          />
        </div>

        <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
          <span className="font-extrabold text-md">{t('cashFlow.netIncreaseDecrease')}</span>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-extrabold text-xl ${totals.netCashFlow >= 0 ? 'text-success' : 'text-error'}`}>
              {symbol}{totals.netCashFlow.toLocaleString(locale, { minimumFractionDigits: 2 })} {currency}
            </span>
            <RenderDelta current={totals.netCashFlow} prior={priorTotals ? priorTotals.netCashFlow : 0} showDelta={!!comparisonReport} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
