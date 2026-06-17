import {
  CURRENCY_LIST,
  CURRENCIES,
  CurrencyInfo,
  isValidCurrencyCode,
  getCurrencyInfo,
} from './iso-4217-data';
import { PREFERENCES, getPreference } from './preferences';

/**
 * Default currency code for the application (Australian Dollar).
 */
export const DEFAULT_CURRENCY = 'AUD';

/**
 * Set of all valid ISO 4217 currency codes supported by the application.
 * Auto-generated from the comprehensive ISO data module.
 */
export const SUPPORTED_CURRENCIES = new Set(Object.keys(CURRENCIES));

/**
 * Currency option entries for UI dropdowns.
 * - `key`: 3-letter ISO code (e.g. "AUD")
 * - `i18nKey`: Legacy translation key for backward compatibility with old `tCommon(c.i18nKey)` calls.
 *               Generated as `currency{Xxx}` pattern (e.g. `currencyAud`).
 * - `name`: English display name from ISO data (e.g. "Australian Dollar")
 */
export const CURRENCY_OPTIONS: { key: string; i18nKey: string; name: string }[] =
  CURRENCY_LIST.map((c) => ({
    key: c.code,
    i18nKey: `currency${c.code.charAt(0)}${c.code.slice(1).toLowerCase()}`,
    name: c.name,
  }));

/**
 * Get the currency symbol for a given currency code.
 * Uses the comprehensive ISO 4217 data map, falling back to '$'.
 */
export function getCurrencySymbol(currency: string): string {
  const info = getCurrencyInfo(currency);
  if (!info) return '$';
  // Return the symbol from our data if it's a real symbol (not just the code itself)
  // When symbol equals the code (e.g. CHF -> 'CHF', XAU -> 'XAU'), return the code
  // as a fallback — it's more recognizable than '$'
  if (info.symbol !== info.code) return info.symbol;
  return info.code;
}

/**
 * Read the user's preferred default currency.
 * Delegates to the unified preferences utility for cookie-first reads.
 *
 * @deprecated Use `getPreference(PREFERENCES.defaultCurrency)` from `@/lib/preferences`
 *             for client-side reads, or the `preferredCurrency` prop from server components.
 *             This wrapper is kept for backward compatibility and validates the value against
 *             supported currencies.
 */
export function getPreferredCurrency(): string {
  const val = getPreference(PREFERENCES.defaultCurrency);
  // Validate the value against supported currencies (legacy behavior)
  if (SUPPORTED_CURRENCIES.has(val)) return val;
  return DEFAULT_CURRENCY;
}

/**
 * Format a number with compact notation (e.g. 1.5m, 2.3b).
 * Supports locale-aware suffixes for Chinese (万/亿).
 */
export function formatCompactNumber(n: number, locale?: string): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  // Chinese compact notation (locale starts with 'zh')
  if (locale && (locale.startsWith('zh') || locale.startsWith('Hans'))) {
    if (abs >= 100_000_000) {
      return `${sign}${Math.round((abs / 100_000_000) * 10) / 10}亿`;
    }
    if (abs >= 10_000) {
      return `${sign}${Math.round((abs / 10_000) * 10) / 10}万`;
    }
    return `${sign}${abs.toLocaleString(locale)}`;
  }

  // Default compact notation (k / m / b)
  if (abs >= 1_000_000_000) {
    return `${sign}${Math.round((abs / 1_000_000_000) * 10) / 10}b`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${Math.round((abs / 1_000_000) * 10) / 10}m`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round((abs / 1_000) * 10) / 10}k`;
  }
  return n.toLocaleString(locale);
}
