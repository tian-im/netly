'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getFinancialReports, getTransactions } from '../actions';
import { generateLedgerCSV, downloadCSV } from '@/lib/csv-export';
import { Upload, RefreshCw } from 'lucide-react';

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
  const now = new Date();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial URL params or fall back to defaults
  const urlStart = searchParams.get('start');
  const urlEnd = searchParams.get('end');
  const urlCur = searchParams.get('cur');

  const defaultStartStr = urlStart || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const defaultEndStr = urlEnd || now.toISOString().split('T')[0];
  const defaultCur = urlCur || 'AUD';

  // State
  const [startDateStr, setStartDateStr] = useState(defaultStartStr);
  const [endDateStr, setEndDateStr] = useState(defaultEndStr);
  const [selectedReportCurrency, setSelectedReportCurrency] = useState(defaultCur);
  const [comparePrior, setComparePrior] = useState(false);

  // Compiled reports
  const [reports, setReports] = useState<FinancialReports | null>(null);
  const [comparisonReports, setComparisonReports] = useState<FinancialReports | null>(null);

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
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Sync URL search params
  const syncParams = (start: string, end: string, cur: string) => {
    const params = new URLSearchParams();
    params.set('start', start);
    params.set('end', end);
    params.set('cur', cur);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const loadReports = (startStr = startDateStr, endStr = endDateStr) => {
    startTransition(async () => {
      try {
        const data = await getFinancialReports(startStr, endStr);
        setReports(data);

        // Fetch comparison reports if toggled
        if (comparePrior) {
          const start = new Date(startStr);
          const end = new Date(endStr);
          const durationMs = end.getTime() - start.getTime();
          const priorEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
          const priorStart = new Date(priorEnd.getTime() - durationMs);
          
          const priorStartStr = priorStart.toISOString().split('T')[0];
          const priorEndStr = priorEnd.toISOString().split('T')[0];
          
          const compData = await getFinancialReports(priorStartStr, priorEndStr);
          setComparisonReports(compData);
        } else {
          setComparisonReports(null);
        }

        syncParams(startStr, endStr, selectedReportCurrency);
      } catch (err: any) {
        showToast(err.message || t('noReportDesc'), 'error');
      }
    });
  };

  // Load initially or when dates/comparison changes
  useEffect(() => {
    loadReports();
  }, [comparePrior]);

  // Sync currency changes to URL
  const handleCurrencyChange = (cur: string) => {
    setSelectedReportCurrency(cur);
    syncParams(startDateStr, endDateStr, cur);
  };

  // Preset handler
  const handlePresetSelect = (start: string, end: string) => {
    setStartDateStr(start);
    setEndDateStr(end);
    loadReports(start, end);
  };

  // Available currencies
  const reportCurrencies = useMemo(() => {
    if (!reports) return ['AUD'];
    return Array.from(new Set([
      ...Object.keys(reports.balanceSheet.totals),
      ...Object.keys(reports.incomeStatement.totals),
      ...Object.keys(reports.cashFlowStatement.totals)
    ]));
  }, [reports]);

  // Auto-adjust currency selection if unavailable in current reports
  useEffect(() => {
    if (reports && reportCurrencies.length > 0 && !reportCurrencies.includes(selectedReportCurrency)) {
      handleCurrencyChange(reportCurrencies[0]);
    }
  }, [reports, reportCurrencies]);

  const handleExportCSV = async () => {
    try {
      const { transactions: txs } = await getTransactions();
      if (txs.length === 0) {
        showToast(t('noTxToExport'), 'error');
        return;
      }

      const csvContent = generateLedgerCSV(txs as any);
      downloadCSV(csvContent, `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
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
          <Upload className="h-4 w-4" /> {t('exportLedger')}
        </button>
      </div>

      {/* Date Filters card */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-5">
          <div className="flex flex-col md:flex-row items-end gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-bold">{t('startDate')}</span>
                </label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>
              <div className="form-control flex-1">
                <label className="label">
                  <span className="label-text font-bold">{t('endDate')}</span>
                </label>
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
                  onChange={(e) => setComparePrior(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-xs"
                />
                <span className="label-text text-xs font-semibold">{t('comparePrior')}</span>
              </label>
              <button
                onClick={() => loadReports()}
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
          <DateRangePresets onSelectRange={handlePresetSelect} />
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
