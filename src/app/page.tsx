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

  // Compute default currency (most common) so the client doesn't duplicate this logic
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

  // Pre-compute net worth trend data for ALL active currencies (Fix #1).
  // Uses an incremental approach: sort transactions once, then process each
  // monthly boundary sequentially, accumulating running balances (Fix #6).
  // This replaces the O(N×M) pattern of calling generateBalanceSheet per month.
  const netWorthTrendByCurrency: Record<string, { date: string; value: number }[]> = {};
  if (activeCurrencies.length > 0 && trendMonths.length > 0) {
    // Initialize per-currency arrays
    for (const currency of activeCurrencies) {
      netWorthTrendByCurrency[currency] = [];
    }

    // Sort transactions once, oldest first
    const sortedTxs = [...mappedTransactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Initialize running balances per account with their starting balance
    const runningBalances: Record<string, number> = {};
    for (const acct of mappedAccounts) {
      runningBalances[acct.id] = acct.startingBalance;
    }

    // Sort trend months chronologically (they are already from `map` above, oldest first)
    let txIdx = 0;
    for (const m of trendMonths) {
      const endMs = m.end.getTime();
      // Process all transactions up to this month-end boundary
      while (txIdx < sortedTxs.length && new Date(sortedTxs[txIdx].date).getTime() <= endMs) {
        const tx = sortedTxs[txIdx];
        runningBalances[tx.accountId] = (runningBalances[tx.accountId] || 0) + tx.amount;
        txIdx++;
      }

      // Compute net worth for each currency at this boundary
      for (const currency of activeCurrencies) {
        let totalAssets = 0;
        let totalLiabilities = 0;
        for (const acct of mappedAccounts) {
          if ((acct.currency || 'AUD') !== currency) continue;
          const rawBalance = runningBalances[acct.id] ?? acct.startingBalance;
          const balance = acct.type === 'LIABILITY' ? -rawBalance : rawBalance;
          if (acct.type === 'ASSET') {
            totalAssets += balance;
          } else {
            totalLiabilities += balance;
          }
        }
        netWorthTrendByCurrency[currency].push({
          date: m.date,
          value: totalAssets - totalLiabilities,
        });
      }
    }
  }

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
      defaultCurrency={defaultCurrency}
    />
  );
}
