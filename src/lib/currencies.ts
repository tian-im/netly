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
 */
export function formatCompactNumber(n: number, locale?: string): string {
  if (Math.abs(n) >= 1_000_000_000) {
    return `${Math.round((n / 1_000_000_000) * 10) / 10}b`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${Math.round((n / 1_000_000) * 10) / 10}m`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round((n / 1_000) * 10) / 10}k`;
  }
  return n.toLocaleString(locale);
}
