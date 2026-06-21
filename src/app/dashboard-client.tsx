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
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';
import { useLocaleContext } from '@/app/providers';
import { getPeriodDates, buildReportsUrl, buildCategoryTransactionsUrl, buildDashboardUrl, buildAccountsUrl, buildTransactionsUrl } from '@/lib/links';
import { Button, Card } from '@/app/components/ui';

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

// WHY: Centralised config replaces the previous ternary-chain + Map-lookup
// duplication. The months field drives slicedNetWorthTrend, while titleKey
// and labelKey feed i18n lookups — a single source of truth for all three
// range-dependent computations.
const NET_WORTH_RANGES = [
  { id: '3m', months: 3, titleKey: 'periodTitle3m', labelKey: 'periodLabel3m' },
  { id: '6m', months: 6, titleKey: 'periodTitle6m', labelKey: 'periodLabel6m' },
  { id: '12m', months: 12, titleKey: 'periodTitle12m', labelKey: 'periodLabel12m' },
] as const;

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
  /** Server-computed default currency (most common across accounts). */
  defaultCurrency: string;
  /** User's preferred default currency from cookie (fallback when no accounts). */
  preferredCurrency?: string;
  /**
   * ISO string of the server's `new Date()` at render time.
   * WHY: Passing this from the server prevents hydration mismatches when
   * the client computes `getPeriodDates(period, now)` in a different timezone.
   * `new Date()` on server vs browser can produce different local-time
   * interpretations, and getPeriodDates uses local-time Date constructors
   * internally (new Date(year, month, day)), which amplifies the drift.
   */
  serverNow: string;
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
  defaultCurrency: serverDefaultCurrency,
  preferredCurrency = DEFAULT_CURRENCY,
  serverNow,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const tAccounts = useTranslations('accounts');
  const format = useFormatter();
  const { locale } = useLocaleContext();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Unified set of all active currencies across accounts
  const activeCurrencies = useMemo(() => {
    // WHY: When there are no accounts, we use preferredCurrency directly (server-computed
    // from cookie, available during SSR). Previously this was gated behind an `isClient`
    // state which caused a flash from DEFAULT_CURRENCY → preferredCurrency after hydration.
    // The server-provided prop is the correct value even during SSR.
    if (accounts.length === 0) {
      return [preferredCurrency];
    }
    return Array.from(new Set(accounts.map((a) => a.currency || DEFAULT_CURRENCY)));
  }, [accounts, preferredCurrency]);

  // Use the server-computed default currency (most common across accounts).
  // This eliminates a duplicate computation that was fragile and could drift (Fix #4).
  const defaultCurrency = serverDefaultCurrency;

  const [selectedVisualCurrency, setSelectedVisualCurrency] = useState(defaultCurrency);
  const [netWorthRange, setNetWorthRange] = useState<'3m' | '6m' | '12m'>('12m');

  // Sync selected visual currency state when defaultCurrency prop-derived value changes
  useEffect(() => {
    setSelectedVisualCurrency(defaultCurrency);
  }, [defaultCurrency]);
  const currentVisualCurrency = useMemo(() => {
    // WHY: Use the server-provided preferredCurrency (from cookie) instead of
    // the old client-side getPreferredCurrency() which read localStorage.
    return activeCurrencies.includes(selectedVisualCurrency)
      ? selectedVisualCurrency
      : (activeCurrencies[0] || preferredCurrency);
  }, [activeCurrencies, selectedVisualCurrency, preferredCurrency]);
  const symbol = getCurrencySymbol(currentVisualCurrency);

  // WHY: Use the server's now (passed as ISO string) instead of new Date() to
  // avoid hydration mismatch. The server and browser may be in different timezones,
  // and getPeriodDates uses local-time Date constructors internally. By sharing
  // the server's reference point, both sides compute identical period boundaries.
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const { firstDay: displayFirstDay, lastDay: displayLastDay } = useMemo(
    () => getPeriodDates(period, now),
    [period, now],
  );

  /*
   * DESIGN DECISION (2026-06-12): No mobile tab switching for the bottom panel trio.
   *
   * On mobile, the Cash Flow Metrics, Income Breakdown, and Expense Breakdown panels
   * are all stacked vertically rather than hidden behind tabs. Rationale:
   *
   *   1. A dashboard is an at-a-glance overview. Tabs hide 2 of 3 panels, forcing
   *      extra taps and breaking the comparison flow between cash flow, income, and
   *      expenses — which are co-equal peer metrics.
   *
   *   2. With only 3 items, vertical scrolling is entirely reasonable. The extra scroll
   *      to reach the accounts table below is marginal.
   *
   *   3. The desktop layout already proves the point — it shows all three side-by-side
   *      in a 3-column grid because comparison matters. The mobile layout should
   *      preserve the same information hierarchy, just stacked.
   *
   * The previous implementation used a mobileTab state and tabs-box to switch between
   * panels. Do NOT revert to tabs without a clear user-research justification showing
   * that the vertical-space savings outweigh the loss of at-a-glance overview.
   */

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

  // Computed date range for display (uses centralized period math)
  const dateRange = useMemo(
    () => ({
      start: format.dateTime(displayFirstDay, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      end: format.dateTime(displayLastDay, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }),
    [displayFirstDay, displayLastDay, format],
  );

  // Net worth trend data for the selected currency
  const netWorthTrend = useMemo(() => {
    const trendData = netWorthTrendByCurrency[currentVisualCurrency] || [];
    return trendData.map((item) => ({
      label: format.dateTime(new Date(item.date), { month: 'short' }),
      value: item.value,
    }));
  }, [netWorthTrendByCurrency, currentVisualCurrency, format]);

  // Find the selected range configuration (always exists since netWorthRange is of type '3m' | '6m' | '12m')
  const rangeOpt = NET_WORTH_RANGES.find((r) => r.id === netWorthRange);

  // Sliced trend data based on the local range toggle
  const slicedNetWorthTrend = useMemo(() => {
    // Defensive fallback of 12 is used, though rangeOpt is guaranteed to exist for all valid keys
    const sliceCount = rangeOpt ? rangeOpt.months : 12;
    return netWorthTrend.slice(-sliceCount);
  }, [netWorthTrend, netWorthRange]);

  // Dynamic net worth chart title reflecting the local range (cheap lookup, no useMemo needed)
  const netWorthTrendTitle = t('netWorthTrend', {
    period: rangeOpt ? t(rangeOpt.titleKey) : '',
    currency: currentVisualCurrency,
  });

  // Range selector component for the net worth card header (cheap render, no useMemo needed)
  const netWorthRangeSelector = (
    <div className="flex gap-1 bg-base-200 p-0.5 rounded-lg shrink-0 self-start sm:self-center" role="group" aria-label={t('netWorthRangeLabel')}>
      {NET_WORTH_RANGES.map((r) => {
        const isActive = netWorthRange === r.id;
        return (
          <Button
            key={r.id}
            data-range={r.id}
            onClick={() => setNetWorthRange(r.id)}
            size="xs"
            className="rounded-md px-3"
            variant={isActive ? "primary" : "segmented"}
            aria-pressed={isActive}
          >
            {t(r.labelKey)}
          </Button>
        );
      })}
    </div>
  );

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
    // For 'current' period, prorate by days elapsed in the month (Fix #3).
    // Future-dated transactions don't exist, so the effective data range is
    // [firstDay, today], not [firstDay, lastDay]. Dividing by 1 month would
    // understate the monthly burn/income rate early in the month.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.min(now.getDate(), daysInMonth);
    return daysElapsed / daysInMonth; // e.g., 12/30 = 0.4
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
      router.push(buildDashboardUrl(params));
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
        <Card bg="bg-base-200" shadow="lg" className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl">
          <div className="flex items-center gap-4 text-left">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('noAccounts')}</h3>
              <p className="text-sm opacity-75 mt-1">{t('noAccountsCreated')}</p>
            </div>
          </div>
          <Button
            href={buildAccountsUrl()}
            className="shadow-md hover:scale-105 transition-transform shrink-0"
          >
            {tAccounts('createAccount')}
          </Button>
        </Card>
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
          <Button
            href={buildTransactionsUrl('uncategorized')}
            variant="warning"
            size="sm"
            className="gap-1 hover:scale-105 transition-transform"
          >
            {t('categorizeNow')} <ArrowRight className="h-4 w-4" />
          </Button>
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
              ).map((p) => {
                const isActive = period === p.id;
                return (
                  <Button
                    key={p.id}
                    onClick={() => handlePeriodChange(p.id)}
                    size="xs"
                    className="rounded-md"
                    variant={isActive ? "primary" : "segmented"}
                    aria-pressed={isActive}
                    title={`${p.label} (⌘${p.key})`}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            href={buildReportsUrl(period, now, currentVisualCurrency)}
            variant="outline"
            size="xs"
            className="text-primary border-primary/20 hover:border-primary/50 hover:bg-primary/5"
          >
            {t('detailedStatements')} <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {activeCurrencies.length >= 1 && (
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold opacity-60">{t('currencyLabel')}</span>
            <div className="flex flex-wrap gap-1 bg-base-200 p-0.5 rounded-lg" role="group" aria-label={t('currencyLabel')}>
              {activeCurrencies.map((cur) => {
                const isActive = currentVisualCurrency === cur;
                return (
                  <Button
                    key={cur}
                    onClick={() => setSelectedVisualCurrency(cur)}
                    size="xs"
                    className="rounded-md"
                    variant={isActive ? "primary" : "segmented"}
                    aria-pressed={isActive}
                  >
                    {cur}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 
        Overview Stat Cards — 2×2 quadrant grid on mobile, 4-column single row on desktop.
        DESIGN DECISION (2026-06-12): We use a 2×2 grid on mobile to show all four KPI cards 
        at a glance without horizontal scrolling. The previous implementation used a horizontal 
        scroll layout (flex + overflow-x-auto) which hid 3 of 4 cards off-screen, requiring 
        users to swipe left/right — a poor UX for key financial metrics.
        Do NOT revert to horizontal scrolling without consulting the team.
      */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Net Worth */}
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

        {/* Net Income */}
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

        {/* Savings Rate */}
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
            colorClass: savingsRate >= 20 ? 'progress-success' : savingsRate >= 0 ? 'progress-warning' : 'progress-error',
          }}
          subtitle={t('targetSavings')}
        />

        {/* Cash runway / cash balance info */}
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

      {/* Main visual blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Trend (Line Chart) */}
        <NetWorthTrendChart
          title={netWorthTrendTitle}
          data={slicedNetWorthTrend}
          noDataText={t('noDataAccounts')}
          isEmpty={accounts.length === 0}
          locale={locale}
          tooltipLabel={t('chartTooltipNetWorth')}
          rangeSelector={netWorthRangeSelector}
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

      {/* Cash Flow details & Category breakdown — stacked on mobile, 3-column on desktop */}
      {/*
       * DESIGN DECISION (2026-06-12): All three panels are always visible (stacked on mobile,
       * side-by-side on desktop). The previous implementation used tabs on mobile, but
       * the at-a-glance nature of a dashboard makes hiding 2 of 3 panels behind tabs
       * counterproductive. See the comment by the state declarations above for the full
       * rationale. Do NOT revert to tabs without user-research justification.
       */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Statement card */}
        <div className="lg:block">
          <CashFlowMetrics
            title={t('cashFlowMetrics', { currency: currentVisualCurrency })}
            ocf={ocf}
            fcf={fcf}
            investingNet={visualCF.investing.net}
            financingNet={visualCF.financing.net}
            ocfLabel={t('ocf')}
            fcfLabel={t('fcf')}
            investingLabel={t('investingCashFlow')}
            financingLabel={t('financingCashFlow')}
            detailedStatementsLabel={t('detailedStatements')}
            detailedStatementsHref={buildReportsUrl(period, now, currentVisualCurrency)}
            currency={currentVisualCurrency}
            locale={locale}
          />
        </div>

        {/* Income Sources breakdown */}
        <div className="lg:block">
          <BreakdownList
            title={t('incomeBreakdown', { currency: currentVisualCurrency })}
            titleColor="success"
            items={sortedIncome.map((item) => ({
              ...item,
              href: categoryIdMap[item.name] ? buildCategoryTransactionsUrl(categoryIdMap[item.name]) : undefined,
            }))}
            totalAmount={visualIS.totalIncome}
            emptyMessage={t('noIncome')}
            progressColorClass="progress-success"
            currency={currentVisualCurrency}
            locale={locale}
          />
        </div>

        {/* Expense Categories progress bars */}
        <div className="lg:block">
          <BreakdownList
            title={t('expenseBreakdown', { currency: currentVisualCurrency })}
            titleColor="error"
            items={sortedExpenses.map((item) => ({
              ...item,
              href: categoryIdMap[item.name] ? buildCategoryTransactionsUrl(categoryIdMap[item.name]) : undefined,
            }))}
            totalAmount={visualIS.totalExpenses}
            emptyMessage={t('noExpense')}
            progressColorClass="progress-secondary"
            currency={currentVisualCurrency}
            locale={locale}
          />
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
