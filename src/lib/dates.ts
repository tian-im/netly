import { PeriodType } from './links';

/**
 * Formats a Date object, string, or number representation of a date
 * into a standard YYYY-MM-DD string representation in UTC.
 */
export function formatDateISO(date: Date | string | number = new Date()): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * WHY: We use a specific, unified set of keys for date range preferences stored in
 * both localStorage and cookies, represented by PreferenceDateRange.
 */
export type PreferenceDateRange = 'Month' | '3m' | '6m' | 'ytd' | '12m';

/**
 * Read the user's preferred default date range from localStorage.
 * Falls back to 'Month' if not set or invalid.
 * Only available in browser environments — returns 'Month' during SSR.
 *
 * WHY: Client components use getPreferredDateRange to read from localStorage for
 * UI state initialization or fallbacks when query params are unavailable.
 */
export function getPreferredDateRange(): PreferenceDateRange {
  if (typeof window === 'undefined') return 'Month';
  try {
    const saved = localStorage.getItem('netly_pref_default_date_range');
    if (saved === 'Month' || saved === '3m' || saved === '6m' || saved === 'ytd' || saved === '12m') {
      return saved as PreferenceDateRange;
    }
  } catch {
    // localStorage may throw in some environments
  }
  return 'Month';
}

/**
 * Maps the default date range preference to the Dashboard's PeriodType.
 *
 * WHY: The Dashboard uses 'current' to represent the current month, whereas
 * other parts of the application or the settings panel use 'Month'. This maps them.
 *
 * WHY: This function accepts `string` (not just `PreferenceDateRange`) so server
 * components can pass cookie values directly without an `as any` cast. Invalid
 * values fall back to 'current' rather than silently propagating a wrong value.
 */
export function mapPreferenceToDashboardPeriod(pref: string): PeriodType {
  if (pref === 'Month') return 'current';
  // Use DATE_RANGE_TO_PERIOD_TYPE values as the valid set
  if (pref === '3m' || pref === '6m' || pref === 'ytd' || pref === '12m') return pref;
  return 'current';
}

/**
 * Maps the default date range preference to the Transactions FilterBar's key.
 *
 * WHY: The Transactions page uses CamelCase naming (like 'threeMonths', 'sixMonths', 'twelveMonths')
 * for its FilterBar states, which differs from the Settings keys ('3m', '6m', '12m').
 * This function translates the keys to maintain compatibility without rewriting FilterBar states.
 *
 * WHY: Accepts `string` (not just `PreferenceDateRange`) so server components can pass cookie
 * values directly without an `as any` cast. The `default` branch handles unexpected input.
 */
export function mapPreferenceToTransactionPeriod(pref: string): keyof typeof DATE_RANGE_TO_PERIOD_TYPE {
  switch (pref) {
    case 'Month': return 'month';
    case '3m': return 'threeMonths';
    case '6m': return 'sixMonths';
    case '12m': return 'twelveMonths';
    case 'ytd': return 'ytd';
    default: return 'month';
  }
}

/**
 * Maps FilterBar dateRange values (camelCase) to PeriodType values used by the
 * Dashboard and getPeriodDates. This is the inverse direction of
 * mapPreferenceToTransactionPeriod (which goes from PreferenceDateRange to FilterBar).
 *
 * Used by both the client-side mapping functions and the server-side actions.ts
 * to eliminate duplicated if/else chains.
 *
 * WHY: Both dates.ts and actions.ts need this reverse mapping from FilterBar convention
 * to PeriodType. Maintaining two separate if/else chains would create drift risk.
 * A single Record keeps all mappings in one place.
 *
 * WHY: A plain object is used instead of a Map because V8 optimises object property
 * access better than Map.get() for small, fixed-key dictionaries, and the type inference
 * from `as const` provides better autocompletion than a Map-based lookup.
 */
export const DATE_RANGE_TO_PERIOD_TYPE = {
  month: 'current',
  threeMonths: '3m',
  sixMonths: '6m',
  twelveMonths: '12m',
  ytd: 'ytd',
} as const satisfies Record<string, PeriodType>;

/**
 * WHY: We use three separate mapping functions (mapPreferenceToDashboardPeriod,
 * mapPreferenceToTransactionPeriod, DATE_RANGE_TO_PERIOD_TYPE) instead of a single
 * parameterised converter because each consumer uses a different naming convention:
 *
 *   PreferenceDateRange → 'Month' | '3m' | '6m' | 'ytd' | '12m'
 *   Dashboard PeriodType → 'current' | '3m' | '6m' | 'ytd' | '12m'
 *   FilterBar dateRange  → 'month' | 'threeMonths' | 'sixMonths' | 'twelveMonths' | 'ytd'
 *
 * A single function with an "output format" parameter would couple all three naming
 * conventions into one signature and make it harder to add new consumers. Separate
 * functions also make TypeScript return-type inference simpler.
 *
 * WHY: Inline `===` validation is used instead of a `Set<string>` check because the
 * list of valid PreferenceDateRange values is small (5 entries) and stable, making
 * the `===` approach simpler to read without extracting a shared constant. If the
 * set grows beyond ~8 values, consider using a Set or array.includes() instead.
 */
