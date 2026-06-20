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
  // WHY: Use Date.UTC + getUTC* methods instead of local-time Date constructors.
  // `new Date(year, month, day)` creates a date at midnight in the local timezone,
  // which causes hydration mismatches when the server (UTC) and client browser
  // (e.g., UTC+8) interpret the same numeric (year, month, day) as different
  // absolute moments. Date.UTC always produces UTC-midnight timestamps, making
  // this function timezone-independent.
  const nowY = now.getUTCFullYear();
  const nowM = now.getUTCMonth();
  const nowD = now.getUTCDate();

  const lastDay = new Date(Date.UTC(nowY, nowM + 1, 0));

  let firstDay: Date;
  switch (period) {
    case '3m':
      firstDay = new Date(Date.UTC(nowY, nowM - 2, 1));
      break;
    case '6m':
      firstDay = new Date(Date.UTC(nowY, nowM - 5, 1));
      break;
    case '12m':
      firstDay = new Date(Date.UTC(nowY, nowM - 11, 1));
      break;
    case 'ytd':
      firstDay = new Date(Date.UTC(nowY, 0, 1));
      break;
    default: // 'current'
      firstDay = new Date(Date.UTC(nowY, nowM, 1));
      break;
  }

  const firstY = firstDay.getUTCFullYear();
  const firstM = firstDay.getUTCMonth();
  const lastY = lastDay.getUTCFullYear();
  const lastM = lastDay.getUTCMonth();

  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;

  if (period === 'ytd') {
    // For YTD, compare against the same calendar window in the prior year
    prevPeriodStart = new Date(Date.UTC(nowY - 1, 0, 1));
    const lastDayOfPrevYearSameMonth = new Date(
      Date.UTC(nowY - 1, nowM + 1, 0),
    ).getUTCDate();
    const safeDay = Math.min(nowD, lastDayOfPrevYearSameMonth);
    prevPeriodEnd = new Date(Date.UTC(nowY - 1, nowM, safeDay));
  } else {
    // For all other periods, the prior period has the same duration and
    // ends the day before the current period starts.
    prevPeriodEnd = new Date(Date.UTC(firstY, firstM, 0));
    const durationMonths =
      (lastY - firstY) * 12 +
      lastM - firstM +
      1;
    prevPeriodStart = new Date(
      Date.UTC(firstY, firstM - durationMonths, 1),
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
 * Build a URL to the Financial Statements page.
 *
 * - With `period` and `now`: pre-fills the date range (and optionally currency).
 * - Without arguments: returns the plain `/reports` path, suitable for static nav links.
 *
 * WHY: Static navigation links (e.g. in the sidebar) need a no-arg variant because
 * they don't have a period/now context at module-init time.
 *
 * TypeScript overloads ensure callers either pass all required args (period + now)
 * or none at all. Passing period without now (or vice versa) is a compile-time error.
 */
export function buildReportsUrl(): string;
export function buildReportsUrl(period: PeriodType, now: Date, currency?: string): string;
export function buildReportsUrl(period?: PeriodType, now?: Date, currency?: string): string {
  if (!period || !now) return '/reports';
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

// ---------------------------------------------------------------------------
// Top-level page route builders
// ---------------------------------------------------------------------------

/**
 * Build a URL to the home / dashboard page.
 * If `params` is provided, appends them as the query string.
 *
 * WHY: Centralising all route generation in one file means future route changes
 * (e.g. `/` → `/dashboard`) require only a single edit instead of hunting down
 * every hardcoded string across the codebase.
 */
export function buildDashboardUrl(params?: URLSearchParams | string): string {
  const qs = typeof params === 'string' ? params : params?.toString();
  return qs ? `/?${qs}` : '/';
}

/** Build a URL to the Accounts management page. */
export function buildAccountsUrl(): string {
  return '/accounts';
}

/** Build a URL to the CSV Import page. */
export function buildImportUrl(): string {
  return '/import';
}

/**
 * Build a URL to the Transaction Ledger.
 *
 * The optional `filter` parameter maps to a recognised preset:
 *   - `'uncategorized'` → `?isReviewed=false`
 *
 * Unknown filter values are silently ignored (return bare `/transactions`)
 * because the page does not accept a generic `?filter=` param.
 * For account- or category-scoped URLs use `buildAccountTransactionsUrl()` or
 * `buildCategoryTransactionsUrl()` instead.
 */
export function buildTransactionsUrl(params?: URLSearchParams | string): string {
  const base = '/transactions';
  if (!params) return base;

  if (typeof params === 'string') {
    if (params === 'uncategorized') {
      return `${base}?isReviewed=false`;
    }
    // If it's a query string, append it directly. Otherwise return base path.
    if (params.includes('=') || params.startsWith('?')) {
      return params.startsWith('?') ? `${base}${params}` : `${base}?${params}`;
    }
    return base;
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Build a URL to the Categories management page. */
export function buildCategoriesUrl(): string {
  return '/categories';
}

/** Build a URL to the Settings page. */
export function buildSettingsUrl(): string {
  return '/settings';
}

/** Build a URL to the User Manual documentation page. */
// WHY: Centralising this path in links.ts allows us to define and modify
// the route to the public manual in a single location.
export function buildDocsUrl(): string {
  return '/docs';
}

/** Build a URL to the login page. */
export function buildLoginUrl(): string {
  return '/login';
}

/**
 * Build a URL to the WebAuthn setup page.
 * Pass `withToken: true` to preserve the setup-token flow.
 */
export function buildSetupUrl(withToken?: boolean): string {
  return withToken ? '/setup?setupToken=1' : '/setup';
}

// WHY: Ko-fi URL is an external link tied to the project owner's account.
// Centralising it here means updating it in one place instead of hunting
// down every hardcoded string across components.
const KOFI_USERNAME = 'tianim'; // TODO: replace with real username

/** Build a URL to the Ko-fi support page. */
export function buildKoFiUrl(): string {
  return `https://ko-fi.com/${KOFI_USERNAME}`;
}
