/**
 * Link helpers for building dashboard navigation URLs with correct query parameters.
 * Centralises query param logic so it stays consistent across components.
 */

export type PeriodType = 'current' | '3m' | '6m' | 'ytd' | '12m';

/**
 * All date boundaries needed by both the server-side SSR page and the client
 * dashboard for a given period type relative to `now`.
 *
 * - firstDay / lastDay: the date range for current-period data queries
 * - prevPeriodStart / prevPeriodEnd: the same-duration period immediately
 *   preceding the current period (used for delta/comparison arrows)
 */
export interface PeriodDates {
  firstDay: Date;
  lastDay: Date;
  prevPeriodStart: Date;
  prevPeriodEnd: Date;
}

export function getPeriodDates(period: PeriodType, now: Date): PeriodDates {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let firstDay: Date;
  switch (period) {
    case '3m':
      firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case '6m':
      firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case '12m':
      firstDay = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      break;
    case 'ytd':
      firstDay = new Date(now.getFullYear(), 0, 1);
      break;
    default: // 'current'
      firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;

  if (period === 'ytd') {
    // For YTD, compare against the same calendar window in the prior year
    prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastDayOfPrevYearSameMonth = new Date(
      now.getFullYear() - 1,
      now.getMonth() + 1,
      0,
    ).getDate();
    const safeDay = Math.min(now.getDate(), lastDayOfPrevYearSameMonth);
    prevPeriodEnd = new Date(now.getFullYear() - 1, now.getMonth(), safeDay);
  } else {
    // For all other periods, the prior period has the same duration and
    // ends the day before the current period starts.
    prevPeriodEnd = new Date(firstDay.getFullYear(), firstDay.getMonth(), 0);
    const durationMonths =
      (lastDay.getFullYear() - firstDay.getFullYear()) * 12 +
      lastDay.getMonth() -
      firstDay.getMonth() +
      1;
    prevPeriodStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth() - durationMonths,
      1,
    );
  }

  return { firstDay, lastDay, prevPeriodStart, prevPeriodEnd };
}

/**
 * Compute the ISO date range for a given period type relative to `now`.
 * Convenience wrapper around `getPeriodDates` for URL builders.
 */
export function getPeriodDateRange(
  period: PeriodType,
  now: Date,
): { start: string; end: string } {
  const { firstDay, lastDay } = getPeriodDates(period, now);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0],
  };
}

/**
 * Build a URL to the Financial Statements page pre-filled with the selected period and currency.
 */
export function buildReportsUrl(
  period: PeriodType,
  now: Date,
  currency?: string,
): string {
  const { start, end } = getPeriodDateRange(period, now);
  const params = new URLSearchParams({ start, end });
  if (currency) {
    params.set('cur', currency);
  }
  return `/reports?${params.toString()}`;
}

/**
 * Build a URL to the Transaction Ledger filtered to a specific account.
 */
export function buildAccountTransactionsUrl(accountId: string): string {
  return `/transactions?accountId=${encodeURIComponent(accountId)}`;
}

/**
 * Build a URL to the Transaction Ledger filtered to a specific category.
 */
export function buildCategoryTransactionsUrl(categoryId: string): string {
  return `/transactions?categoryId=${encodeURIComponent(categoryId)}`;
}
