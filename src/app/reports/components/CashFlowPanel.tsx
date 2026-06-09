'use client';

import { useTranslations } from 'next-intl';
import { CashFlowStatement, CashFlowSection } from '../types';
import { ArrowDownRight, Search } from 'lucide-react';

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
  const totals = report.totals[currency] || {
    operating: { inflow: 0, outflow: 0, net: 0 },
    investing: { inflow: 0, outflow: 0, net: 0 },
    financing: { inflow: 0, outflow: 0, net: 0 },
    netCashFlow: 0,
  };

  const priorTotals = comparisonReport?.totals[currency] || null;

  const renderDelta = (current: number, prior: number, isOutflow = false) => {
    if (!comparisonReport) return null;
    const delta = current - prior;
    if (delta === 0) return <span className="text-xs text-base-content/40 font-mono">0.00 (0%)</span>;

    const pctChange = prior !== 0 ? (delta / Math.abs(prior)) * 100 : 100;
    // For outflows, lower is better. For inflows/net, higher is better.
    const isPositiveImpact = isOutflow ? delta < 0 : delta > 0;

    return (
      <span className={`text-xs font-semibold font-mono ${isPositiveImpact ? 'text-success' : 'text-error'}`}>
        {delta > 0 ? '+' : ''}
        {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {' '}({delta > 0 ? '+' : ''}{pctChange.toFixed(0)}%)
      </span>
    );
  };

  const renderSection = (
    title: string,
    sectionName: 'operating' | 'investing' | 'financing',
    data: CashFlowSection,
    priorData: CashFlowSection | null
  ) => {
    return (
      <div className="bg-base-200/40 p-5 rounded-xl border border-base-300/40">
        <div className="flex justify-between items-center font-bold text-sm border-b border-base-300 pb-2 mb-3">
          <span>{title}</span>
          <div className="flex flex-col items-end">
            <span className={data.net >= 0 ? 'text-success' : 'text-error'}>
              ${data.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {priorData && renderDelta(data.net, priorData.net)}
          </div>
        </div>

        <div className="space-y-2 text-xs px-2 text-base-content/75">
          {/* Inflow row */}
          <div className="flex justify-between items-start">
            <button
              onClick={() => onDrillDown(`${title} (${t('cashFlow.inflow')})`, { cashFlowSection: sectionName, cashFlowType: 'inflow' })}
              className="hover:underline hover:text-primary text-left focus:outline-none flex items-center gap-1"
            >
              {t('cashFlow.inflowsLabel')} <Search className="h-3 w-3 opacity-60" />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-success font-semibold">
                +${data.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {priorData && renderDelta(data.inflow, priorData.inflow)}
            </div>
          </div>

          {/* Outflow row */}
          <div className="flex justify-between items-start">
            <button
              onClick={() => onDrillDown(`${title} (${t('cashFlow.outflow')})`, { cashFlowSection: sectionName, cashFlowType: 'outflow' })}
              className="hover:underline hover:text-primary text-left focus:outline-none flex items-center gap-1"
            >
              {t('cashFlow.outflowsLabel')} <Search className="h-3 w-3 opacity-60" />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-error font-semibold">
                -${data.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {priorData && renderDelta(data.outflow, priorData.outflow, true)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
      <input type="radio" name="reports-accordion" /> 
      <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
        <span className="flex items-center gap-2">
          <ArrowDownRight className="h-5 w-5" /> {t('cashFlow.title')} ({currency})
        </span>
        <span className="text-sm font-semibold opacity-60">
          {t('cashFlow.netCashFlowLabel')}: ${totals.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {priorTotals && (
            <span className="ml-2 pl-2 border-l border-base-300 text-xs text-base-content/50">
              {t('cashFlow.priorLabel')}: ${priorTotals.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </span>
      </div>
      <div className="collapse-content px-6 pb-6">
        <div className="divider my-0"></div>

        <div className="space-y-6 mt-4">
          {renderSection(
            t('cashFlow.operatingActivitiesTitle'),
            'operating',
            totals.operating,
            priorTotals?.operating || null
          )}
          {renderSection(
            t('cashFlow.investingActivitiesTitle'),
            'investing',
            totals.investing,
            priorTotals?.investing || null
          )}
          {renderSection(
            t('cashFlow.financingActivitiesTitle'),
            'financing',
            totals.financing,
            priorTotals?.financing || null
          )}
        </div>

        <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
          <span className="font-extrabold text-md">{t('cashFlow.netIncreaseDecrease')}</span>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-extrabold text-xl ${totals.netCashFlow >= 0 ? 'text-success' : 'text-error'}`}>
              ${totals.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
            </span>
            {priorTotals && renderDelta(totals.netCashFlow, priorTotals.netCashFlow)}
          </div>
        </div>
      </div>
    </div>
  );
}
