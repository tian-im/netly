/**
 * Set of currency codes supported by the application.
 * Used for server-side validation and UI dropdown options.
 */
export const SUPPORTED_CURRENCIES = new Set(['AUD', 'USD', 'EUR', 'GBP', 'SGD', 'NZD', 'CAD', 'CNY']);

/**
 * Currency option entries for UI dropdowns (create form, edit form).
 * The `key` matches SUPPORTED_CURRENCIES entries and the `i18nKey` is
 * the `common.*` translation key for the display label.
 */
export const CURRENCY_OPTIONS: { key: string; i18nKey: string }[] = [
  { key: 'AUD', i18nKey: 'currencyAud' },
  { key: 'USD', i18nKey: 'currencyUsd' },
  { key: 'EUR', i18nKey: 'currencyEur' },
  { key: 'GBP', i18nKey: 'currencyGbp' },
  { key: 'SGD', i18nKey: 'currencySgd' },
  { key: 'NZD', i18nKey: 'currencyNzd' },
  { key: 'CAD', i18nKey: 'currencyCad' },
  { key: 'CNY', i18nKey: 'currencyCny' },
];

/**
 * Shared utility to get the symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency?.toUpperCase()) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY':
    case 'CNY': return '¥';
    default: return '$';
  }
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
