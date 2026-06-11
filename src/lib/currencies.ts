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
