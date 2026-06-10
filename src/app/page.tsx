import { db } from '@/lib/db';
import { getAccounts } from './actions';
import DashboardClient from './dashboard-client';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateCashFlowStatement,
  mapTransactionForClient,
} from '@/lib/reports';
import { getFormatter } from 'next-intl/server';

export const revalidate = 0; // Disable caching so dashboard is always up-to-date

type PeriodType = 'current' | '3m' | '6m' | 'ytd' | '12m';

interface PageProps {
  searchParams: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const period = (searchParams.period || 'current') as PeriodType;
  const accountsList = await getAccounts();
  const uncategorizedCount = await db.transaction.count({ where: { categoryId: null } });

  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
    _count: a._count,
  }));

  const now = new Date();

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

  // Calculate maximum end date needed for any of the trends / balances (up to lastDay or prevPeriodEnd)
  const maxEndDate = lastDay > prevPeriodEnd ? lastDay : prevPeriodEnd;

  // Query database transactions up to maxEndDate
  const dbTransactions = await db.transaction.findMany({
    where: {
      date: {
        lte: maxEndDate,
      },
    },
    include: {
      account: true,
      category: true,
    },
  });

  const mappedTransactions = dbTransactions.map(mapTransactionForClient);

  // Generate Current Statements
  const bs = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDay);
  const is = generateIncomeStatement(mappedTransactions, firstDay, lastDay);
  const cfs = generateCashFlowStatement(mappedTransactions, firstDay, lastDay);

  // Generate Prior Statements
  const prevBS = generateBalanceSheet(mappedAccounts, mappedTransactions, prevPeriodEnd);
  const prevIS = generateIncomeStatement(mappedTransactions, prevPeriodStart, prevPeriodEnd);

  // Generate Net Worth Trend over the selected period (trailing or fixed to period size)
  let trendLength = 12;
  if (period === 'current') trendLength = 6;
  else if (period === '3m') trendLength = 3;
  else if (period === '6m') trendLength = 6;
  else if (period === 'ytd') trendLength = now.getMonth() + 1;
  else if (period === '12m') trendLength = 12;

  const format = await getFormatter();

  const trendMonths = Array.from({ length: trendLength }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (trendLength - 1 - i), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      label: format.dateTime(d, { month: 'short' }),
      end: monthEnd,
    };
  });

  // Since trend calculations might need historical net worth, compute balance sheets for end dates
  // activeCurrencies is used in client, but let's pre-aggregate netWorthTrend values per currency
  const activeCurrencies = Array.from(new Set(mappedAccounts.map((a) => a.currency || 'AUD')));
  
  // Pre-generate trend data for each currency
  const netWorthTrendByCurrency: Record<string, { label: string; value: number }[]> = {};
  
  activeCurrencies.forEach((currency) => {
    netWorthTrendByCurrency[currency] = trendMonths.map((m) => {
      const tempBS = generateBalanceSheet(mappedAccounts, mappedTransactions, m.end);
      const value = tempBS.totals[currency]?.netWorth ?? 0;
      return {
        label: m.label,
        value,
      };
    });
  });

  // Format serializable statements
  const serializedBS = {
    accounts: bs.accounts.map(a => ({ id: a.id, balance: a.balance })),
    totals: bs.totals,
  };

  const serializedPrevBS = {
    totals: prevBS.totals,
  };

  return (
    <DashboardClient
      accounts={mappedAccounts}
      uncategorizedCount={uncategorizedCount}
      period={period}
      bs={serializedBS}
      is={is}
      cfs={cfs}
      prevBS={serializedPrevBS}
      prevIS={prevIS}
      netWorthTrendByCurrency={netWorthTrendByCurrency}
    />
  );
}
