'use client';

import { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calendar,
  ArrowRight,
  DollarSign,
  Activity,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { getCurrencySymbol } from '@/lib/currencies';
import { useLocaleContext } from '@/app/providers';
import { buildReportsUrl, buildCategoryTransactionsUrl } from '@/lib/links';

// Subcomponents
import StatCard from './dashboard-components/StatCard';
import NetWorthTrendChart from './dashboard-components/NetWorthTrendChart';
import IncomeVsExpensesChart from './dashboard-components/IncomeVsExpensesChart';
import CashFlowMetrics from './dashboard-components/CashFlowMetrics';
import BreakdownList from './dashboard-components/BreakdownList';
import AccountBalancesTable from './dashboard-components/AccountBalancesTable';

interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  _count?: { transactions: number };
}

type PeriodType = 'current' | '3m' | '6m' | 'ytd' | '12m';

interface DashboardClientProps {
  accounts: Account[];
  categories: { id: string; name: string }[];
  uncategorizedCount: number;
  uncategorizedByAccount?: Record<string, number>;
  period: PeriodType;
  bs: {
    accounts: { id: string; balance: number }[];
    totals: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number }>;
  };
  is: {
    totals: Record<string, {
      income: { name: string; amount: number }[];
      expenses: { name: string; amount: number }[];
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
    }>;
  };
  cfs: {
    totals: Record<string, {
      operating: { inflow: number; outflow: number; net: number };
      investing: { inflow: number; outflow: number; net: number };
      financing: { inflow: number; outflow: number; net: number };
      netCashFlow: number;
    }>;
  };
  prevBS: {
    totals: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number }>;
  };
  prevIS: {
    totals: Record<string, {
      income: { name: string; amount: number }[];
      expenses: { name: string; amount: number }[];
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
    }>;
  };
  netWorthTrendByCurrency: Record<string, { date: string; value: number }[]>;
}

export default function DashboardClient({
  accounts,
  categories = [],
  uncategorizedCount,
  uncategorizedByAccount = {},
  period,
  bs,
  is,
  cfs,
  prevBS,
  prevIS,
  netWorthTrendByCurrency,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const tAccounts = useTranslations('accounts');
  const format = useFormatter();
  const { locale } = useLocaleContext();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Unified set of all active currencies across accounts
  const activeCurrencies = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.currency || 'AUD')));
  }, [accounts]);

  // Derive most common account currency
  const defaultCurrency = useMemo(() => {
    if (accounts.length === 0) return 'AUD';
    const counts: Record<string, number> = {};
    accounts.forEach((a) => {
      const c = a.currency || 'AUD';
      counts[c] = (counts[c] || 0) + 1;
    });
    let maxCurrency = 'AUD';
    let maxCount = 0;
    Object.entries(counts).forEach(([curr, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxCurrency = curr;
      }
    });
    return maxCurrency;
  }, [accounts]);

  const [selectedVisualCurrency, setSelectedVisualCurrency] = useState(defaultCurrency);

  // Sync selected visual currency state when defaultCurrency prop-derived value changes
  useEffect(() => {
    setSelectedVisualCurrency(defaultCurrency);
  }, [defaultCurrency]);
  const currentVisualCurrency = useMemo(() => {
    return activeCurrencies.includes(selectedVisualCurrency)
      ? selectedVisualCurrency
      : (activeCurrencies[0] || 'AUD');
  }, [activeCurrencies, selectedVisualCurrency]);
  const symbol = getCurrencySymbol(currentVisualCurrency);

  const now = useMemo(() => new Date(), []);

  // === Mobile-specific state ===
  const [mobileTab, setMobileTab] = useState<'cf' | 'income' | 'expense'>('cf');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === Keyboard shortcuts for period switching ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const keyMap: Record<string, PeriodType> = {
        '1': 'current',
        '2': '3m',
        '3': '6m',
        '4': 'ytd',
        '5': '12m',
      };
      const mappedPeriod = keyMap[e.key];
      if (mappedPeriod && mappedPeriod !== period) {
        handlePeriodChange(mappedPeriod);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Translated period title for use in headers (e.g. "3 Months" / "3个月")
  const periodTitle = useMemo(() => {
    const map: Record<string, string> = {
      current: t('periodTitleMonth'),
      '3m': t('periodTitle3m'),
      '6m': t('periodTitle6m'),
      ytd: t('periodTitleYtd'),
      '12m': t('periodTitle12m'),
    };
    return map[period] || period.toUpperCase();
  }, [period, t]);

  // Computed date range for display
  const dateRange = useMemo(() => {
    const end = now;
    let start: Date;
    switch (period) {
      case '3m':
        start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
        break;
      case '6m':
        start = new Date(end.getFullYear(), end.getMonth() - 6, 1);
        break;
      case '12m':
        start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
        break;
      case 'ytd':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
    }
    return {
      start: format.dateTime(start, { month: 'short', day: 'numeric', year: 'numeric' }),
      end: format.dateTime(end, { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }, [period, now, format]);

  // Net worth trend data for the selected currency
  const netWorthTrend = useMemo(() => {
    const trendData = netWorthTrendByCurrency[currentVisualCurrency] || [];
    return trendData.map((item) => ({
      label: format.dateTime(new Date(item.date), { month: 'short' }),
      value: item.value,
    }));
  }, [netWorthTrendByCurrency, currentVisualCurrency, format]);

  // Selected currency metrics
  const visualIS = useMemo(() => {
    return is.totals[currentVisualCurrency] || {
      income: [],
      expenses: [],
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
    };
  }, [is, currentVisualCurrency]);

  const visualCF = useMemo(() => {
    return cfs.totals[currentVisualCurrency] || {
      operating: { inflow: 0, outflow: 0, net: 0 },
      investing: { inflow: 0, outflow: 0, net: 0 },
      financing: { inflow: 0, outflow: 0, net: 0 },
      netCashFlow: 0,
    };
  }, [cfs, currentVisualCurrency]);

  // Savings rate calculation
  const savingsRate = useMemo(() => {
    return visualIS.totalIncome > 0
      ? (visualIS.netIncome / visualIS.totalIncome) * 100
      : 0;
  }, [visualIS]);

  // OCF & FCF
  const ocf = useMemo(() => visualCF.operating.net, [visualCF]);
  const fcf = useMemo(() => visualCF.operating.net - visualCF.investing.outflow, [visualCF]);

  // Cash Runway calculation
  const liquidAssets = useMemo(() => {
    return bs.totals[currentVisualCurrency]?.totalAssets ?? 0;
  }, [bs, currentVisualCurrency]);

  const periodMonths = useMemo(() => {
    if (period === '3m') return 3;
    if (period === '6m') return 6;
    if (period === 'ytd') return now.getMonth() + 1;
    if (period === '12m') return 12;
    return 1;
  }, [period, now]);

  const averageMonthlyCashFlow = useMemo(() => {
    return visualCF.netCashFlow / periodMonths;
  }, [visualCF.netCashFlow, periodMonths]);

  const isBurn = useMemo(() => averageMonthlyCashFlow < 0, [averageMonthlyCashFlow]);
  const runwayMonths = useMemo(() => {
    return isBurn ? liquidAssets / Math.abs(averageMonthlyCashFlow) : null;
  }, [isBurn, liquidAssets, averageMonthlyCashFlow]);

  // Category name → ID lookup for building drill-down links
  const categoryIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.name] = c.id; });
    return map;
  }, [categories]);

  // Sort categories descending
  const sortedExpenses = useMemo(() => {
    return [...visualIS.expenses].sort((a, b) => b.amount - a.amount);
  }, [visualIS.expenses]);

  const sortedIncome = useMemo(() => {
    return [...visualIS.income].sort((a, b) => b.amount - a.amount);
  }, [visualIS.income]);

  // Account balances map for the table
  const calculatedBalances = useMemo(() => {
    const balancesMap: Record<string, number> = {};
    bs.accounts.forEach((a) => {
      balancesMap[a.id] = a.balance;
    });
    return balancesMap;
  }, [bs]);

  // Net Worth StatCard Values
  const nwValues = useMemo(() => {
    const currentNW = bs.totals[currentVisualCurrency]?.netWorth ?? 0;
    const priorNW = prevBS.totals[currentVisualCurrency]?.netWorth ?? 0;
    const nwDelta = currentNW - priorNW;
    const nwPct = priorNW !== 0 ? (nwDelta / Math.abs(priorNW)) * 100 : 0;
    return { currentNW, nwDelta, nwPct };
  }, [bs, prevBS, currentVisualCurrency]);

  // Net Income StatCard Values
  const netIncomeValues = useMemo(() => {
    const periodIncome = visualIS.netIncome;
    const priorIncome = prevIS.totals[currentVisualCurrency]?.netIncome ?? 0;
    const incomeDelta = periodIncome - priorIncome;
    const incomePct = priorIncome !== 0 ? (incomeDelta / Math.abs(priorIncome)) * 100 : 0;
    return { periodIncome, incomeDelta, incomePct };
  }, [visualIS, prevIS, currentVisualCurrency]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set('period', newPeriod);
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className={`space-y-6 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
          {t('title')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('subtitle')}
        </p>
        {accounts.length > 0 && (
          <p className="text-xs text-base-content/40 mt-1">
            {t('dateRangeLabel', { start: dateRange.start, end: dateRange.end })}
          </p>
        )}
      </div>

      {/* Empty State / CTA Callout */}
      {accounts.length === 0 && (
        <div className="card bg-base-200 border border-base-300 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg rounded-3xl">
          <div className="flex items-center gap-4 text-left">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('noAccounts')}</h3>
              <p className="text-sm opacity-75 mt-1">{t('noAccountsCreated')}</p>
            </div>
          </div>
          <Link
            href="/accounts"
            className="btn btn-primary shadow-md hover:scale-105 transition-transform shrink-0"
          >
            {tAccounts('createAccount')}
          </Link>
        </div>
      )}

      {/* Review Queue Alert banner */}
      {uncategorizedCount > 0 && (
        <div className="alert alert-warning shadow-lg border-l-4 border-warning flex justify-between items-center bg-warning/10 text-warning-content">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <span className="font-bold">{t('uncategorizedPending')}</span>
              <p className="text-xs opacity-90 mt-0.5">
                {t('uncategorizedDesc', { count: uncategorizedCount })}
              </p>
            </div>
          </div>
          <Link
            href="/transactions?filter=uncategorized"
            className="btn btn-warning btn-sm gap-1 hover:scale-105 transition-transform"
          >
            {t('categorizeNow')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Selector Options Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-2xl shadow-sm border border-base-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 gap-y-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <span className="font-bold text-sm text-base-content/70 shrink-0">{t('analyzePeriod')}</span>
            <div className="flex flex-wrap gap-1 bg-base-200 p-0.5 rounded-lg" role="group" aria-label={t('analyzePeriod')}>
              {(
                [
                  { id: 'current', label: t('periodLabelMonth'), key: '1' },
                  { id: '3m', label: t('periodLabel3m'), key: '2' },
                  { id: '6m', label: t('periodLabel6m'), key: '3' },
                  { id: 'ytd', label: t('periodLabelYtd'), key: '4' },
                  { id: '12m', label: t('periodLabel12m'), key: '5' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  className={`btn btn-xs rounded-md border-0 gap-1 ${
                    period === p.id
                      ? 'btn-primary text-primary-content shadow-sm'
                      : 'bg-transparent text-base-content/70 hover:bg-base-300'
                  }`}
                  aria-pressed={period === p.id}
                  title={`${p.label} (⌘${p.key})`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href={buildReportsUrl(period, now, currentVisualCurrency)}
            className="btn btn-outline btn-xs gap-1 text-primary border-primary/20 hover:border-primary/50 hover:bg-primary/5"
          >
            {t('detailedStatements')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {activeCurrencies.length > 1 && (
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold opacity-60">{t('currencyLabel')}</span>
            <div className="flex flex-wrap gap-1 bg-base-200 p-0.5 rounded-lg" role="group" aria-label={t('currencyLabel')}>
              {activeCurrencies.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setSelectedVisualCurrency(cur)}
                  className={`btn btn-xs rounded-md border-0 ${
                    currentVisualCurrency === cur
                      ? 'btn-primary text-primary-content shadow-sm'
                      : 'bg-transparent text-base-content/70 hover:bg-base-300'
                  }`}
                  aria-pressed={currentVisualCurrency === cur}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overview Stat Cards — mobile horizontal scroll, desktop grid */}
      <div className="flex md:grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4 overflow-x-auto md:overflow-visible snap-x md:snap-none scrollbar-none -mx-4 md:mx-0 px-4 md:px-0">
        {/* Net Worth */}
        <div className="min-w-[280px] md:min-w-0 snap-start shrink-0">
        <StatCard
          title={t('netWorth')}
          icon={<DollarSign className="h-5 w-5" />}
          href={buildReportsUrl(period, now, currentVisualCurrency)}
          value={
            <span className={nwValues.currentNW >= 0 ? 'text-success' : 'text-error'}>
              {nwValues.currentNW >= 0 ? '' : '-'}{symbol}{Math.abs(nwValues.currentNW).toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend={{
            delta: nwValues.nwDelta,
            pct: nwValues.nwPct,
            isPositive: nwValues.nwDelta >= 0,
            vsLabel: t('vsPrior'),
            upLabel: t('trendUp'),
            downLabel: t('trendDown'),
          }}
          currency={currentVisualCurrency}
          locale={locale}
        />
        </div>

        {/* Net Income */}
        <div className="min-w-[280px] md:min-w-0 snap-start shrink-0">
        <StatCard
          title={t('netIncome', { period: periodTitle })}
          icon={<Activity className="h-5 w-5" />}
          href={buildReportsUrl(period, now, currentVisualCurrency)}
          value={
            <span className={netIncomeValues.periodIncome >= 0 ? 'text-success' : 'text-error'}>
              {netIncomeValues.periodIncome >= 0 ? '' : '-'}{symbol}{Math.abs(netIncomeValues.periodIncome).toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend={{
            delta: netIncomeValues.incomeDelta,
            pct: netIncomeValues.incomePct,
            isPositive: netIncomeValues.incomeDelta >= 0,
            vsLabel: t('vsPrior'),
            upLabel: t('trendUp'),
            downLabel: t('trendDown'),
          }}
          currency={currentVisualCurrency}
          locale={locale}
        />
        </div>

        {/* Savings Rate */}
        <div className="min-w-[280px] md:min-w-0 snap-start shrink-0">
        <StatCard
          title={t('savingsRate')}
          icon={<PiggyBank className="h-5 w-5" />}
          href={buildReportsUrl(period, now, currentVisualCurrency)}
          value={
            <span className={savingsRate >= 0 ? 'text-success' : 'text-error'}>
              {savingsRate.toFixed(1)}%
            </span>
          }
          progress={{
            percentage: savingsRate,
            colorClass: savingsRate >= 20 ? 'bg-success' : savingsRate >= 0 ? 'bg-warning' : 'bg-error',
          }}
          subtitle={t('targetSavings')}
        />
        </div>

        {/* Cash runway / cash balance info */}
        <div className="min-w-[280px] md:min-w-0 snap-start shrink-0">
        <StatCard
          title={t('cashRunway')}
          icon={<AlertTriangle className={`h-5 w-5 ${isBurn ? 'text-error animate-pulse' : 'text-success'}`} />}
          href={buildReportsUrl(period, now, currentVisualCurrency)}
          value={
            isBurn && runwayMonths !== null ? (
              <span className="text-error">
                {runwayMonths < 1 ? t('runwayUnderMonth') : t('runwayMonths', { months: runwayMonths.toFixed(1) })}
              </span>
            ) : (
              <span className="text-success">{t('infiniteRunway')}</span>
            )
          }
          subtitle={
            isBurn && runwayMonths !== null
              ? t('burnRate', { symbol, amount: Math.abs(averageMonthlyCashFlow).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
              : t('netCashFlow', { symbol, amount: averageMonthlyCashFlow.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
          }
          currency={currentVisualCurrency}
          locale={locale}
        />
        </div>
      </div>

      {/* Main visual blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Trend (Line Chart) */}
        <NetWorthTrendChart
          title={t('netWorthTrend', { period: periodTitle, currency: currentVisualCurrency })}
          data={netWorthTrend}
          noDataText={t('noDataAccounts')}
          isEmpty={accounts.length === 0}
          locale={locale}
          tooltipLabel={t('chartTooltipNetWorth')}
        />

        {/* Income vs Expenses Summary */}
        <IncomeVsExpensesChart
          title={t('incomeVsExpenses', { currency: currentVisualCurrency })}
          subtitle={t('revenueVsSpending')}
          totalIncome={visualIS.totalIncome}
          totalExpenses={visualIS.totalExpenses}
          incomeLabel={t('totalIncome')}
          expenseLabel={t('totalExpenses')}
          chartIncomeLabel={t('chartIncomeLabel')}
          chartExpenseLabel={t('chartExpenseLabel')}
          currency={currentVisualCurrency}
          locale={locale}
          tooltipLabel={t('chartTooltipAmount')}
        />
      </div>

      {/* Cash Flow details & Category break down grid — tabs on mobile, columns on desktop */}
      <div>
        {/* Mobile Tab Selector (hidden on lg+) */}
        <div className="tabs tabs-box bg-base-100 border border-base-200 p-1 mb-4 lg:hidden" role="tablist">
          <button
            role="tab"
            className={`tab tab-sm ${mobileTab === 'cf' ? 'tab-active' : ''}`}
            onClick={() => setMobileTab('cf')}
            aria-selected={mobileTab === 'cf'}
          >
            {t('cashFlowMetrics', { currency: currentVisualCurrency })}
          </button>
          <button
            role="tab"
            className={`tab tab-sm ${mobileTab === 'income' ? 'tab-active' : ''}`}
            onClick={() => setMobileTab('income')}
            aria-selected={mobileTab === 'income'}
          >
            {t('incomeBreakdown', { currency: '' }).replace(/\(.*\)/, '').trim()}
          </button>
          <button
            role="tab"
            className={`tab tab-sm ${mobileTab === 'expense' ? 'tab-active' : ''}`}
            onClick={() => setMobileTab('expense')}
            aria-selected={mobileTab === 'expense'}
          >
            {t('expenseBreakdown', { currency: '' }).replace(/\(.*\)/, '').trim()}
          </button>
        </div>

        {/* Desktop: 3-column grid (lg+), Mobile: single active panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Flow Statement card — hide on mobile unless active tab */}
          <div className={`${isMobile && mobileTab !== 'cf' ? 'hidden' : ''} lg:block`}>
            <CashFlowMetrics
              title={t('cashFlowMetrics', { currency: currentVisualCurrency })}
              ocf={ocf}
              fcf={fcf}
              investingNet={visualCF.investing.net}
              financingNet={visualCF.financing.net}
              ocfLabel={isMobile ? t('ocfShort') : t('ocf')}
              fcfLabel={isMobile ? t('fcfShort') : t('fcf')}
              investingLabel={isMobile ? t('investingCashFlowShort') : t('investingCashFlow')}
              financingLabel={isMobile ? t('financingCashFlowShort') : t('financingCashFlow')}
              detailedStatementsLabel={t('detailedStatements')}
              detailedStatementsHref={buildReportsUrl(period, now, currentVisualCurrency)}
              currency={currentVisualCurrency}
              locale={locale}
            />
          </div>

          {/* Income Sources breakdown — hide on mobile unless active tab */}
          <div className={`${isMobile && mobileTab !== 'income' ? 'hidden' : ''} lg:block`}>
            <BreakdownList
              title={t('incomeBreakdown', { currency: currentVisualCurrency })}
              titleColorClass="text-success"
              items={sortedIncome.map((item) => ({
                ...item,
                href: buildCategoryTransactionsUrl(categoryIdMap[item.name] || item.name),
              }))}
              totalAmount={visualIS.totalIncome}
              emptyMessage={t('noIncome')}
              progressColorClass="progress-success"
              currency={currentVisualCurrency}
              locale={locale}
            />
          </div>

          {/* Expense Categories progress bars — hide on mobile unless active tab */}
          <div className={`${isMobile && mobileTab !== 'expense' ? 'hidden' : ''} lg:block`}>
            <BreakdownList
              title={t('expenseBreakdown', { currency: currentVisualCurrency })}
              titleColorClass="text-error"
              items={sortedExpenses.map((item) => ({
                ...item,
                href: buildCategoryTransactionsUrl(categoryIdMap[item.name] || item.name),
              }))}
              totalAmount={visualIS.totalExpenses}
              emptyMessage={t('noExpense')}
              progressColorClass="progress-secondary"
              currency={currentVisualCurrency}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* Managed Accounts table */}
      <AccountBalancesTable
        accounts={accounts}
        calculatedBalances={calculatedBalances}
        uncategorizedCounts={uncategorizedByAccount}
      />
    </div>
    </div>
  );
}
