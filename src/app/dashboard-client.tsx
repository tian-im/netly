'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateCashFlowStatement,
} from '@/lib/reports';
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  PiggyBank,
  DollarSign,
  Activity,
  Calendar,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Wallet,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';

interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  date: Date | string;
  amount: number;
  accountId: string;
  currency: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

interface DashboardClientProps {
  initialAccounts: Account[];
  initialTransactions: Transaction[];
  uncategorizedCount: number;
}

type PeriodType = 'current' | '3m' | '6m' | 'ytd' | '12m';

export default function DashboardClient({
  initialAccounts,
  initialTransactions,
  uncategorizedCount,
}: DashboardClientProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const [accounts] = useState(initialAccounts);
  const [period, setPeriod] = useState<PeriodType>('current');

  // Refresh data on mount to resolve stale server count
  useEffect(() => {
    router.refresh();
  }, [router]);

  // Unified set of all active currencies across accounts
  const activeCurrencies = Array.from(new Set(accounts.map((a) => a.currency || 'AUD')));
  const [selectedVisualCurrency, setSelectedVisualCurrency] = useState('AUD');
  const currentVisualCurrency = activeCurrencies.includes(selectedVisualCurrency)
    ? selectedVisualCurrency
    : (activeCurrencies[0] || 'AUD');

  const now = new Date();

  // Parse transaction dates once
  const mappedTransactions = initialTransactions.map((t) => ({
    ...t,
    date: new Date(t.date),
  }));

  const mappedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
  }));

  // Determine current period date boundaries
  let firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (period === '3m') {
    firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (period === '6m') {
    firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  } else if (period === 'ytd') {
    firstDay = new Date(now.getFullYear(), 0, 1);
  } else if (period === '12m') {
    firstDay = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  // Current selected period reports
  const bs = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDay);
  const is = generateIncomeStatement(mappedTransactions, firstDay, lastDay);
  const cfs = generateCashFlowStatement(mappedTransactions, firstDay, lastDay);

  // Dynamic Prior Period Date Ranges for comparative delta arrows
  let prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  if (period === '3m') {
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
  } else if (period === '6m') {
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 5, 0);
  } else if (period === '12m') {
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 11, 0);
  } else if (period === 'ytd') {
    prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastDayOfPrevYearMonth = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(now.getDate(), lastDayOfPrevYearMonth);
    prevPeriodEnd = new Date(now.getFullYear() - 1, now.getMonth(), safeDay);
  }

  // Calculate prior period reports
  const prevBS = generateBalanceSheet(mappedAccounts, mappedTransactions, prevPeriodEnd);
  const prevIS = generateIncomeStatement(mappedTransactions, prevPeriodStart, prevPeriodEnd);

  // Calculate Net Worth Trend over the selected period (trailing or fixed to period size)
  let trendLength = 12;
  if (period === 'current') trendLength = 6; // Trailing 6 months to make current month view readable as a line
  else if (period === '3m') trendLength = 3;
  else if (period === '6m') trendLength = 6;
  else if (period === 'ytd') trendLength = now.getMonth() + 1;
  else if (period === '12m') trendLength = 12;

  const trendMonths = Array.from({ length: trendLength }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (trendLength - 1 - i), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      label: format.dateTime(d, { month: 'short' }),
      end: monthEnd,
    };
  });

  const netWorthTrend = trendMonths.map((m) => {
    const tempBS = generateBalanceSheet(mappedAccounts, mappedTransactions, m.end);
    const value = tempBS.totals[currentVisualCurrency]?.netWorth ?? 0;
    return {
      label: m.label,
      value,
    };
  });

  // Selected currency metrics
  const visualIS = is.totals[currentVisualCurrency] || {
    income: [],
    expenses: [],
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  };

  const visualCF = cfs.totals[currentVisualCurrency] || {
    operating: { inflow: 0, outflow: 0, net: 0 },
    investing: { inflow: 0, outflow: 0, net: 0 },
    financing: { inflow: 0, outflow: 0, net: 0 },
    netCashFlow: 0,
  };

  // Savings rate calculation
  const savingsRate = visualIS.totalIncome > 0 
    ? (visualIS.netIncome / visualIS.totalIncome) * 100 
    : 0;

  // OCF & FCF
  const ocf = visualCF.operating.net;
  const fcf = visualCF.operating.net - visualCF.investing.outflow;

  // Cash Runway calculation
  const liquidAssets = bs.totals[currentVisualCurrency]?.totalAssets ?? 0;
  let periodMonths = 1;
  if (period === '3m') periodMonths = 3;
  else if (period === '6m') periodMonths = 6;
  else if (period === 'ytd') periodMonths = now.getMonth() + 1;
  else if (period === '12m') periodMonths = 12;

  const averageMonthlyCashFlow = visualCF.netCashFlow / periodMonths;
  const isBurn = averageMonthlyCashFlow < 0;
  const runwayMonths = isBurn ? liquidAssets / Math.abs(averageMonthlyCashFlow) : null;

  // Sort categories descending
  const sortedExpenses = [...visualIS.expenses].sort((a, b) => b.amount - a.amount);
  const sortedIncome = [...visualIS.income].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('title')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Review Queue Alert banner */}
      {uncategorizedCount > 0 && (
        <div className="alert alert-warning shadow-md border-l-4 border-warning flex justify-between items-center bg-warning/10 text-warning-content">
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
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm text-base-content/70">{t('analyzePeriod')}</span>
            <div className="join bg-base-200 p-0.5 rounded-lg">
              {(
                [
                  { id: 'current', label: t('periodLabelMonth') },
                  { id: '3m', label: t('periodLabel3m') },
                  { id: '6m', label: t('periodLabel6m') },
                  { id: 'ytd', label: t('periodLabelYtd') },
                  { id: '12m', label: t('periodLabel12m') },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`btn btn-xs join-item rounded-md border-0 ${
                    period === p.id
                      ? 'btn-primary text-primary-content shadow-sm'
                      : 'bg-transparent text-base-content/70 hover:bg-base-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/reports"
            className="btn btn-outline btn-xs gap-1 text-primary border-primary/20 hover:border-primary/50 hover:bg-primary/5"
          >
            {t('detailedStatements')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {activeCurrencies.length > 1 && (
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold opacity-60">{t('currencyLabel')}</span>
            <div className="join bg-base-200 p-0.5 rounded-lg">
              {activeCurrencies.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setSelectedVisualCurrency(cur)}
                  className={`btn btn-xs join-item rounded-md border-0 ${
                    currentVisualCurrency === cur
                      ? 'btn-primary text-primary-content shadow-sm'
                      : 'bg-transparent text-base-content/70 hover:bg-base-300'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="card bg-base-100 shadow-md border border-base-200">
          <div className="card-body p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{t('netWorth')}</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2">
              {accounts.length === 0 ? (
                <span className="text-sm opacity-50">{t('noAccounts')}</span>
              ) : (
                (() => {
                  const currentNW = bs.totals[currentVisualCurrency]?.netWorth ?? 0;
                  const priorNW = prevBS.totals[currentVisualCurrency]?.netWorth ?? 0;
                  const nwDelta = currentNW - priorNW;
                  const nwPct = priorNW !== 0 ? (nwDelta / Math.abs(priorNW)) * 100 : 0;

                  return (
                    <div>
                      <div className={`text-2xl font-extrabold ${currentNW >= 0 ? 'text-success' : 'text-error'}`}>
                        {currentNW >= 0 ? '' : '-'}${Math.abs(currentNW).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {nwDelta >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                        )}
                        <span className={nwDelta >= 0 ? 'text-success font-semibold' : 'text-error font-semibold'}>
                          {nwDelta >= 0 ? '+' : '-'}${Math.abs(nwDelta).toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}{' '}
                          ({nwPct.toFixed(1)}%)
                        </span>
                        <span className="opacity-50">{t('vsPrior')}</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="card bg-base-100 shadow-md border border-base-200">
          <div className="card-body p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold opacity-60 uppercase tracking-wider">
                {t('netIncome', { period: period === 'current' ? t('periodLabelMonth') : period.toUpperCase() })}
              </span>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2">
              {accounts.length === 0 ? (
                <span className="text-sm opacity-50">{t('noAccounts')}</span>
              ) : (
                (() => {
                  const periodIncome = visualIS.netIncome;
                  const priorIncome = prevIS.totals[currentVisualCurrency]?.netIncome ?? 0;
                  const incomeDelta = periodIncome - priorIncome;
                  const incomePct = priorIncome !== 0 ? (incomeDelta / Math.abs(priorIncome)) * 100 : 0;

                  return (
                    <div>
                      <div className={`text-2xl font-extrabold ${periodIncome >= 0 ? 'text-success' : 'text-error'}`}>
                        {periodIncome >= 0 ? '' : '-'}${Math.abs(periodIncome).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {incomeDelta >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                        )}
                        <span className={incomeDelta >= 0 ? 'text-success font-semibold' : 'text-error font-semibold'}>
                          {incomeDelta >= 0 ? '+' : '-'}${Math.abs(incomeDelta).toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}{' '}
                          ({incomePct.toFixed(1)}%)
                        </span>
                        <span className="opacity-50">{t('vsPrior')}</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="card bg-base-100 shadow-md border border-base-200">
          <div className="card-body p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{t('savingsRate')}</span>
              <PiggyBank className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-extrabold ${savingsRate >= 0 ? 'text-success' : 'text-error'}`}>
                {savingsRate.toFixed(1)}%
              </div>
              <div className="w-full bg-base-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${savingsRate >= 20 ? 'bg-success' : savingsRate >= 0 ? 'bg-warning' : 'bg-error'}`}
                  style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                ></div>
              </div>
              <span className="text-xs opacity-50 mt-1 block">{t('targetSavings')}</span>
            </div>
          </div>
        </div>

        {/* Cash runway / cash balance info */}
        <div className="card bg-base-100 shadow-md border border-base-200">
          <div className="card-body p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{t('cashRunway')}</span>
              <AlertTriangle className={`h-5 w-5 ${isBurn ? 'text-error animate-pulse' : 'text-success'}`} />
            </div>
            <div className="mt-2">
              {isBurn && runwayMonths !== null ? (
                <div>
                  <div className="text-2xl font-extrabold text-error">
                    {runwayMonths < 1 ? t('runwayUnderMonth') : t('runwayMonths', { months: runwayMonths.toFixed(1) })}
                  </div>
                  <span className="text-xs text-error font-semibold block mt-1">
                    {t('burnRate', { amount: Math.abs(averageMonthlyCashFlow).toFixed(0) })}
                  </span>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-extrabold text-success">{t('infiniteRunway')}</div>
                  <span className="text-xs text-success font-semibold block mt-1">
                    {t('netCashFlow', { amount: averageMonthlyCashFlow.toFixed(0) })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main visual blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Trend (Line Chart) */}
        <div className="card bg-base-100 shadow-lg border border-base-200 lg:col-span-2">
          <div className="card-body p-6">
            <h3 className="card-title text-base font-bold text-primary flex justify-between items-center">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('netWorthTrend', { period: period.toUpperCase(), currency: currentVisualCurrency })}
              </span>
            </h3>
            
            {accounts.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-base-content/50">
                {t('noDataAccounts')}
              </div>
            ) : (
              <div className="relative w-full h-56 mt-4">
                {(() => {
                  const values = netWorthTrend.map((t) => t.value);
                  const maxVal = Math.max(...values, 100);
                  const minVal = Math.min(...values, 0);
                  const range = maxVal - minVal;

                  const getX = (idx: number) => (idx / (netWorthTrend.length - 1 || 1)) * 90 + 5; // percentage-based X
                  const getY = (val: number) => {
                    if (range === 0) return 50;
                    return 85 - ((val - minVal) / range) * 70; // percentage-based Y (padding 15% top/bottom)
                  };

                  let pathD = '';
                  let areaD = '';
                      if (netWorthTrend.length > 0) {
                    pathD = `M ${getX(0)} ${getY(netWorthTrend[0].value)}`;
                    areaD = `M ${getX(0)} 95 L ${getX(0)} ${getY(netWorthTrend[0].value)}`;
                    for (let i = 1; i < netWorthTrend.length; i++) {
                      const x0 = getX(i - 1);
                      const y0 = getY(netWorthTrend[i - 1].value);
                      const x1 = getX(i);
                      const y1 = getY(netWorthTrend[i].value);
                      const cp1x = x0 + (x1 - x0) / 2;
                      const cp1y = y0;
                      const cp2x = x0 + (x1 - x0) / 2;
                      const cp2y = y1;
                      pathD += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x1} ${y1}`;
                      areaD += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x1} ${y1}`;
                    }
                    areaD += ` L ${getX(netWorthTrend.length - 1)} 95 Z`;
                  }

                  return (
                    <div className="w-full h-full flex flex-col">
                      <div className="relative w-full h-40">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--p))" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="hsl(var(--p))" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
                          <line x1="0" y1="85" x2="100" y2="85" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />

                          {/* Stroke Path */}
                          {pathD && (
                            <path
                              d={pathD}
                              fill="none"
                              className="stroke-primary"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                        </svg>

                        {/* Node Dots */}
                        {netWorthTrend.map((m, idx) => (
                          <div
                            key={idx}
                            style={{
                              left: `${getX(idx)}%`,
                              top: `${getY(m.value)}%`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-base-100 shadow-md transition-all hover:scale-150 cursor-pointer"
                            title={`${m.label}: $${m.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          />
                        ))}
                      </div>
                      {/* X-axis labels */}
                      <div className="flex justify-between text-[10px] font-bold opacity-60 px-1 mt-2">
                        {netWorthTrend.map((m, idx) => (
                          <span key={idx} className={netWorthTrend.length > 7 && idx % 2 !== 0 ? 'hidden sm:inline' : ''}>
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Income vs Expenses Summary */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6 flex flex-col justify-between">
            <div>
              <h3 className="card-title text-base font-bold text-primary mb-1 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('incomeVsExpenses', { currency: currentVisualCurrency })}
              </h3>
              <p className="text-xs opacity-50 mb-4">{t('revenueVsSpending')}</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-6">
              <svg viewBox="0 0 200 100" className="w-full h-32 overflow-visible">
                {/* Income Bar */}
                <rect
                  x="40"
                  y={100 - Math.min(85, (visualIS.totalIncome / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)}
                  width="30"
                  height={Math.min(85, (visualIS.totalIncome / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)}
                  rx="4"
                  className="fill-success transition-all duration-500"
                />
                <text x="55" y="95" textAnchor="middle" className="fill-success-content text-[10px] font-extrabold">{t('chartIncomeLabel')}</text>
                
                {/* Expense Bar */}
                <rect
                  x="130"
                  y={100 - Math.min(85, (visualIS.totalExpenses / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)}
                  width="30"
                  height={Math.min(85, (visualIS.totalExpenses / Math.max(1, visualIS.totalIncome + visualIS.totalExpenses)) * 100)}
                  rx="4"
                  className="fill-error transition-all duration-500"
                />
                <text x="145" y="95" textAnchor="middle" className="fill-error-content text-[10px] font-extrabold">{t('chartExpenseLabel')}</text>
              </svg>

              <div className="w-full grid grid-cols-2 gap-4 text-xs font-bold border-t border-base-200 pt-3">
                <div className="flex flex-col">
                  <span className="text-success/70 text-[10px] uppercase opacity-85">{t('totalIncome')}</span>
                  <span className="text-sm font-extrabold text-success">
                    +${visualIS.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex flex-col border-l border-base-200 pl-3">
                  <span className="text-error/70 text-[10px] uppercase opacity-85">{t('totalExpenses')}</span>
                  <span className="text-sm font-extrabold text-error">
                    -${visualIS.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow details & Category break down grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Statement card */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6 flex flex-col justify-between">
            <div>
              <h3 className="card-title text-base font-bold text-primary mb-4 flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5" />
                {t('cashFlowMetrics', { currency: currentVisualCurrency })}
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-base-200 pb-2">
                  <span className="text-xs font-semibold opacity-70">{t('ocf')}</span>
                  <span className={`font-bold font-mono text-sm ${ocf >= 0 ? 'text-success' : 'text-error'}`}>
                    {ocf >= 0 ? '+' : '-'}${Math.abs(ocf).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-base-200 pb-2">
                  <span className="text-xs font-semibold opacity-70">{t('fcf')}</span>
                  <span className={`font-bold font-mono text-sm ${fcf >= 0 ? 'text-success' : 'text-error'}`}>
                    {fcf >= 0 ? '+' : '-'}${Math.abs(fcf).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-base-200 pb-2">
                  <span className="text-xs font-semibold opacity-70">{t('investingCashFlow')}</span>
                  <span className={`font-bold font-mono text-sm ${visualCF.investing.net >= 0 ? 'text-success' : 'text-error'}`}>
                    {visualCF.investing.net >= 0 ? '+' : '-'}${Math.abs(visualCF.investing.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold opacity-70">{t('financingCashFlow')}</span>
                  <span className={`font-bold font-mono text-sm ${visualCF.financing.net >= 0 ? 'text-success' : 'text-error'}`}>
                    {visualCF.financing.net >= 0 ? '+' : '-'}${Math.abs(visualCF.financing.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-base-200 flex justify-end">
              <Link
                href="/reports"
                className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
              >
                {t('detailedStatements')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Income Sources breakdown */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <h3 className="card-title text-base font-bold text-success mb-2 flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t('incomeBreakdown', { currency: currentVisualCurrency })}
            </h3>
            <div className="space-y-3 mt-4 max-h-[190px] overflow-y-auto pr-1">
              {sortedIncome.length === 0 ? (
                <p className="text-xs text-base-content/50 py-4 text-center">{t('noIncome')}</p>
              ) : (
                sortedIncome.map((inc) => {
                  const percentage = Math.round((inc.amount / Math.max(1, visualIS.totalIncome)) * 100);
                  return (
                    <div key={inc.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{inc.name}</span>
                        <span>
                          ${inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentage}%)
                        </span>
                      </div>
                      <progress className="progress progress-success w-full" value={percentage} max="100"></progress>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Expense Categories progress bars */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <h3 className="card-title text-base font-bold text-error mb-2 flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t('expenseBreakdown', { currency: currentVisualCurrency })}
            </h3>
            <div className="space-y-3 mt-4 max-h-[190px] overflow-y-auto pr-1">
              {sortedExpenses.length === 0 ? (
                <p className="text-xs text-base-content/50 py-4 text-center">{t('noExpense')}</p>
              ) : (
                sortedExpenses.map((exp) => {
                  const percentage = Math.round((exp.amount / Math.max(1, visualIS.totalExpenses)) * 100);
                  return (
                    <div key={exp.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{exp.name}</span>
                        <span>
                          ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentage}%)
                        </span>
                      </div>
                      <progress className="progress progress-secondary w-full" value={percentage} max="100"></progress>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Managed Accounts table */}
      <div className="card bg-base-100 shadow-lg border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold flex justify-between items-center text-primary">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t('accountBalances')}
            </span>
          </h2>
          
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              {t('noAccountsCreated')}
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-base-200">
                    <th>{t('accountName')}</th>
                    <th>{t('accountType')}</th>
                    <th className="text-right">{t('accountBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const calculatedBalance = bs.accounts.find((a) => a.id === acc.id)?.balance;
                    const displayBalance = calculatedBalance !== undefined
                      ? (acc.type === 'LIABILITY' ? -calculatedBalance : calculatedBalance)
                      : acc.startingBalance;
                    return (
                      <tr key={acc.id} className="hover:bg-base-200/50 border-b border-base-200">
                        <td>
                          <div className="font-bold flex items-center gap-2">
                            {acc.name}
                            <span className="badge badge-sm badge-ghost font-bold">{acc.currency}</span>
                          </div>
                          <div className="text-xs text-base-content/50">
                            {t('transactionsCount', { count: acc._count?.transactions || 0 })}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'} badge-sm font-semibold`}>
                            {acc.type}
                          </span>
                        </td>
                        <td className={`text-right font-mono font-bold ${displayBalance >= 0 ? 'text-success' : 'text-error'}`}>
                          ${displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
