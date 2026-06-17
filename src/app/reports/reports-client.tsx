'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getFinancialReports, getTransactions } from '../actions';
import { generateLedgerCSV, downloadCSV } from '@/lib/csv-export';
import { DEFAULT_CURRENCY, getPreferredCurrency } from '@/lib/currencies';
import { Download, RefreshCw } from 'lucide-react';

// Custom components
import DateRangePresets from './components/DateRangePresets';
import TransactionDrillDownModal from './components/TransactionDrillDownModal';
import BalanceSheetPanel from './components/BalanceSheetPanel';
import IncomeStatementPanel from './components/IncomeStatementPanel';
import CashFlowPanel from './components/CashFlowPanel';

// Types
import { FinancialReports } from './types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function ReportsClient() {
  const t = useTranslations('reports');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // WHY: The server component always redirects with start/end params before rendering
  // ReportsClient, so urlStart and urlEnd are guaranteed present. We use simple string
  // lookups instead of a useMemo fallback — no dead code paths.
  const defaultStartStr = searchParams.get('start')!;
  const defaultEndStr = searchParams.get('end')!;
  // Memoize currency fallback only (getPreferredCurrency reads localStorage)
  const defaultCur = useMemo(
    () => searchParams.get('cur') || (mounted ? getPreferredCurrency() : DEFAULT_CURRENCY),
    [searchParams, mounted],
  );

  const urlComparePrior = searchParams.get('comparePrior') === 'true';

  // State
  const [startDateStr, setStartDateStr] = useState(defaultStartStr);
  const [endDateStr, setEndDateStr] = useState(defaultEndStr);
  const [selectedReportCurrency, setSelectedReportCurrency] = useState(defaultCur);
  const [comparePrior, setComparePrior] = useState(urlComparePrior);

  // Compiled reports
  const [reports, setReports] = useState<FinancialReports | null>(null);
  const [comparisonReports, setComparisonReports] = useState<FinancialReports | null>(null);
  const [loadedParams, setLoadedParams] = useState<{ start: string; end: string; compare: boolean } | null>(null);

  // UI state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isPending, startTransition] = useTransition();

  // Drill-down Modal state
  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    title: string;
    accountId?: string;
    categoryName?: string;
    cashFlowSection?: 'operating' | 'investing' | 'financing';
    cashFlowType?: 'inflow' | 'outflow';
  }>({
    isOpen: false,
    title: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Sync URL search params
  const syncParams = (start: string, end: string, cur: string, compare: boolean) => {
    const params = new URLSearchParams();
    params.set('start', start);
    params.set('end', end);
    params.set('cur', cur);
    if (compare) {
      params.set('comparePrior', 'true');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Load when searchParams changes (acts as the single source of truth)
  useEffect(() => {
    const start = searchParams.get('start') || defaultStartStr;
    const end = searchParams.get('end') || defaultEndStr;
    const cur = searchParams.get('cur') || defaultCur;
    const compare = searchParams.get('comparePrior') === 'true';

    setStartDateStr(start);
    setEndDateStr(end);
    setSelectedReportCurrency(cur);
    setComparePrior(compare);

    // If report is already loaded for the target dates and comparison toggle, do not fetch again
    if (reports && loadedParams && loadedParams.start === start && loadedParams.end === end && loadedParams.compare === compare) {
      return;
    }

    startTransition(async () => {
      try {
        const data = await getFinancialReports(start, end);
        setReports(data);

        if (compare) {
          const startD = new Date(start);
          const endD = new Date(end);
          // Use UTC-based calculations to avoid DST boundary issues
          const startUTC = Date.UTC(startD.getFullYear(), startD.getMonth(), startD.getDate());
          const endUTC = Date.UTC(endD.getFullYear(), endD.getMonth(), endD.getDate());
          const durationMs = endUTC - startUTC;
          // For zero-duration periods (start === end), use a 1-day prior period
          const priorEndMs = startUTC - 86400000;
          const priorStartMs = durationMs > 0 ? priorEndMs - durationMs : priorEndMs;
          const priorStart = new Date(priorStartMs);
          const priorEnd = new Date(priorEndMs);
          
          // WHY: For "All Time" preset (1970-01-01), subtracting 1 day produces Dec 1969
          // (before the Unix epoch). The server handles this gracefully (returns empty)
          // but we skip the comparison entirely since a pre-epoch prior period is meaningless.
          const MIN_EPOCH_MS = Date.UTC(1970, 0, 1); // 0
          if (priorStartMs >= MIN_EPOCH_MS && priorEndMs >= MIN_EPOCH_MS) {
            const priorStartStr = priorStart.toISOString().split('T')[0];
            const priorEndStr = priorEnd.toISOString().split('T')[0];
            const compData = await getFinancialReports(priorStartStr, priorEndStr);
            setComparisonReports(compData);
          } else {
            setComparisonReports(null);
          }
        } else {
          setComparisonReports(null);
        }
        setLoadedParams({ start, end, compare });
      } catch (err: any) {
        showToast(err.message || t('noReportDesc'), 'error');
      }
    });
  // searchParams is the single source of truth; defaultXxx values are memoised from it
  // and do not need to be listed as separate deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mounted]);

  // Sync currency changes to URL
  const handleCurrencyChange = (cur: string) => {
    const start = searchParams.get('start') || defaultStartStr;
    const end = searchParams.get('end') || defaultEndStr;
    const compare = searchParams.get('comparePrior') === 'true';
    syncParams(start, end, cur, compare);
  };

  // Preset handler
  const handlePresetSelect = (start: string, end: string) => {
    const cur = searchParams.get('cur') || defaultCur;
    const compare = searchParams.get('comparePrior') === 'true';
    syncParams(start, end, cur, compare);
  };

  // Compare prior toggle handler
  const handleComparePriorChange = (compare: boolean) => {
    const start = searchParams.get('start') || defaultStartStr;
    const end = searchParams.get('end') || defaultEndStr;
    const cur = searchParams.get('cur') || defaultCur;
    syncParams(start, end, cur, compare);
  };

  // Compile button handler
  const handleCompile = () => {
    // Validate start date <= end date
    if (startDateStr && endDateStr && new Date(startDateStr) > new Date(endDateStr)) {
      showToast(t('startBeforeEnd'), 'error');
      return;
    }
    const cur = searchParams.get('cur') || defaultCur;
    syncParams(startDateStr, endDateStr, cur, comparePrior);
  };

  // Available currencies
  const reportCurrencies = useMemo(() => {
    if (!reports) return [mounted ? getPreferredCurrency() : DEFAULT_CURRENCY];
    return Array.from(new Set([
      ...Object.keys(reports.balanceSheet.totals),
      ...Object.keys(reports.incomeStatement.totals),
      ...Object.keys(reports.cashFlowStatement.totals)
    ]));
  }, [reports, mounted]);

  // Auto-adjust currency selection if unavailable in current reports
  useEffect(() => {
    if (reports && reportCurrencies.length > 0 && !reportCurrencies.includes(selectedReportCurrency)) {
      handleCurrencyChange(reportCurrencies[0]);
    }
  }, [reports, reportCurrencies, selectedReportCurrency]);

  const handleExportCSV = async () => {
    try {
      const { transactions: txs } = await getTransactions({
        startDateStr,
        endDateStr,
      });
      if (txs.length === 0) {
        showToast(t('noTxToExport'), 'error');
        return;
      }

      const csvContent = generateLedgerCSV(txs as any);
      const dateLabel = startDateStr && endDateStr ? `${startDateStr}_${endDateStr}` : new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `financial_ledger_${dateLabel}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: any) {
      showToast(t('exportFailed') + err.message, 'error');
    }
  };

  const handleOpenDrillDown = (title: string, options: any) => {
    setDrillDownState({
      isOpen: true,
      title,
      ...options,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
            {t('pageTitle')}
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            {t('pageDesc')}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-outline btn-primary btn-sm gap-2"
          disabled={isPending}
        >
          <Download className="h-4 w-4" /> {t('exportLedger')}
        </button>
      </div>

      {/* Date Filters card */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-5">
          <div className="flex flex-col md:flex-row items-end gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-bold text-base-content">{t('startDate')}</label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-bold text-base-content">{t('endDate')}</label>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <label className="cursor-pointer label justify-start gap-2 self-start md:self-auto">
                <input
                  type="checkbox"
                  checked={comparePrior}
                  onChange={(e) => handleComparePriorChange(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-xs"
                />
                <span className="label-text text-xs font-semibold">{t('comparePrior')}</span>
              </label>
              <button
                onClick={handleCompile}
                className="btn btn-primary btn-sm w-full md:w-auto gap-2"
                disabled={isPending}
              >
                {isPending ? (
                  t('compiling')
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> {t('compile')}
                  </>
                )}
              </button>
            </div>
          </div>
          <DateRangePresets onSelectRange={handlePresetSelect} startDateStr={startDateStr} endDateStr={endDateStr} />
        </div>
      </div>

      {/* Currency tab selector */}
      {reports && reportCurrencies.length > 1 && (
        <div className="flex items-center gap-2 bg-base-100 p-4 rounded-xl shadow border border-base-200 justify-center sm:justify-start">
          <span className="font-bold text-sm text-base-content/70">{t('viewCurrency')}</span>
          <div className="join">
            {reportCurrencies.map((cur) => (
              <button
                key={cur}
                onClick={() => handleCurrencyChange(cur)}
                className={`btn btn-sm join-item ${selectedReportCurrency === cur ? 'btn-primary' : 'btn-outline'}`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isPending && !reports && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-base-100 shadow border border-base-200 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-48 bg-base-200 skeleton rounded"></div>
                <div className="h-6 w-32 bg-base-200 skeleton rounded"></div>
              </div>
              <div className="h-24 bg-base-200 skeleton rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Statements Accordions */}
      {reports ? (
        <div className="space-y-4 relative">
          {isPending && (
            <div className="absolute inset-0 bg-base-100/50 backdrop-blur-[1px] z-10 flex justify-center items-start pt-10 rounded-xl">
              <div className="bg-base-100 p-4 shadow-xl border border-base-200 rounded-xl flex items-center gap-3">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="font-bold text-sm text-base-content/70">{t('updating')}</span>
              </div>
            </div>
          )}
          
          {/* 1. Balance Sheet */}
          <BalanceSheetPanel
            report={reports.balanceSheet}
            comparisonReport={comparisonReports?.balanceSheet || null}
            currency={selectedReportCurrency}
            onDrillDown={handleOpenDrillDown}
          />

          {/* 2. Income Statement */}
          <IncomeStatementPanel
            report={reports.incomeStatement}
            comparisonReport={comparisonReports?.incomeStatement || null}
            currency={selectedReportCurrency}
            onDrillDown={handleOpenDrillDown}
          />

          {/* 3. Cash Flow Statement */}
          <CashFlowPanel
            report={reports.cashFlowStatement}
            comparisonReport={comparisonReports?.cashFlowStatement || null}
            currency={selectedReportCurrency}
            onDrillDown={handleOpenDrillDown}
          />
        </div>
      ) : (
        !isPending && (
          <div className="card bg-base-100 shadow border border-base-200 p-12 text-center">
            <h2 className="text-xl font-bold text-base-content/70">{t('noReport')}</h2>
            <p className="text-sm text-base-content/50 mt-2">
              {t('noReportDesc')}
            </p>
          </div>
        )
      )}

      {/* Drill-down Modal */}
      <TransactionDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState({ isOpen: false, title: '' })}
        title={drillDownState.title}
        startDateStr={startDateStr}
        endDateStr={endDateStr}
        currency={selectedReportCurrency}
        accountId={drillDownState.accountId}
        categoryName={drillDownState.categoryName}
        cashFlowSection={drillDownState.cashFlowSection}
        cashFlowType={drillDownState.cashFlowType}
      />

      {/* Toasts container */}
      <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${t.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg border border-white/10`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
