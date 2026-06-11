/**
 * Link helpers for building dashboard navigation URLs with correct query parameters.
 * Centralises query param logic so it stays consistent across components.
 */

export type PeriodType = 'current' | '3m' | '6m' | 'ytd' | '12m';

/**
 * Compute the ISO date range for a given period type relative to `now`.
 */
export function getPeriodDateRange(period: PeriodType, now: Date): { start: string; end: string } {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  let start: Date;

  switch (period) {
    case '3m':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case '6m':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case '12m':
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default: // 'current'
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Build a URL to the Financial Statements page pre-filled with the selected period and currency.
 */
export function buildReportsUrl(period: PeriodType, now: Date, currency?: string): string {
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
