import { db } from '@/lib/db';
import { getAccounts, getCategories } from './actions';
import DashboardClient from './dashboard-client';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateCashFlowStatement,
  mapTransactionForClient,
} from '@/lib/reports';
import { getPeriodDates } from '@/lib/links';
import type { PeriodType } from '@/lib/links';

export const revalidate = 0; // Disable caching so dashboard is always up-to-date

interface PageProps {
  searchParams: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const period = (searchParams.period || 'current') as PeriodType;
  const accountsList = await getAccounts();
  const categoriesList = await getCategories();
  const uncategorizedCount = await db.transaction.count({ where: { categoryId: null } });

  // Per-account uncategorized transaction counts for AccountBalancesTable badge
  const uncategorizedByAccount: Record<string, number> = {};
  const uncatTxByAccount = await db.transaction.groupBy({
    by: ['accountId'],
    where: { categoryId: null },
    _count: { id: true },
  });
  uncatTxByAccount.forEach((g) => {
    uncategorizedByAccount[g.accountId] = g._count.id;
  });

  const mappedAccounts = accountsList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency,
    _count: a._count,
  }));

  const now = new Date();
  const { firstDay, lastDay, prevPeriodStart, prevPeriodEnd } = getPeriodDates(period, now);

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

  const trendMonths = Array.from({ length: trendLength }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (trendLength - 1 - i), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      date: d.toISOString(),
      end: monthEnd,
    };
  });

  // Since trend calculations might need historical net worth, compute balance sheets for end dates
  // Pre-generate trend data — only for the most common/default currency to save SSR time
  const activeCurrencies = Array.from(new Set(mappedAccounts.map((a) => a.currency || 'AUD')));
  const defaultCurrency = (() => {
    if (mappedAccounts.length === 0) return 'AUD';
    const counts: Record<string, number> = {};
    mappedAccounts.forEach((a) => {
      const c = a.currency || 'AUD';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  })();
  
  const netWorthTrendByCurrency: Record<string, { date: string; value: number }[]> = {};
  
  // Only pre-compute for the default currency; others are fetched on-demand
  netWorthTrendByCurrency[defaultCurrency] = trendMonths.map((m) => {
    const tempBS = generateBalanceSheet(mappedAccounts, mappedTransactions, m.end);
    const value = tempBS.totals[defaultCurrency]?.netWorth ?? 0;
    return {
      date: m.date,
      value,
    };
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
      categories={categoriesList.map((c) => ({ id: c.id, name: c.name }))}
      uncategorizedCount={uncategorizedCount}
      uncategorizedByAccount={uncategorizedByAccount}
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
