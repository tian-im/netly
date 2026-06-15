import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrencySymbol,
  formatCompactNumber,
  SUPPORTED_CURRENCIES,
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  getPreferredCurrency,
} from './currencies';
import { CURRENCY_LIST, isValidCurrencyCode } from './iso-4217-data';

describe('DEFAULT_CURRENCY', () => {
  it('is AUD', () => {
    expect(DEFAULT_CURRENCY).toBe('AUD');
  });
});

describe('getPreferredCurrency', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.restoreAllMocks();
  });

  it('returns DEFAULT_CURRENCY during SSR (no window)', () => {
    expect(getPreferredCurrency()).toBe(DEFAULT_CURRENCY);
  });

  it('returns the stored value when localStorage has a valid currency', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue('EUR');
    Storage.prototype.getItem = getItem;
    expect(getPreferredCurrency()).toBe('EUR');
    expect(getItem).toHaveBeenCalledWith('netly_pref_default_currency');
  });

  it('returns DEFAULT_CURRENCY when localStorage has an unsupported currency', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue('XYZ');
    Storage.prototype.getItem = getItem;
    expect(getPreferredCurrency()).toBe(DEFAULT_CURRENCY);
  });

  it('returns DEFAULT_CURRENCY when localStorage is empty', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue(null);
    Storage.prototype.getItem = getItem;
    expect(getPreferredCurrency()).toBe(DEFAULT_CURRENCY);
  });

  it('handles localStorage throwing gracefully', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockImplementation(() => { throw new Error('localStorage error'); });
    Storage.prototype.getItem = getItem;
    expect(getPreferredCurrency()).toBe(DEFAULT_CURRENCY);
  });
});

describe('SUPPORTED_CURRENCIES', () => {
  it('includes all currencies from the ISO data', () => {
    expect(SUPPORTED_CURRENCIES.size).toBeGreaterThanOrEqual(170);
    expect(SUPPORTED_CURRENCIES.has('AUD')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('USD')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('EUR')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('GBP')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('SGD')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('NZD')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('CAD')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('CNY')).toBe(true);
  });

  it('now includes previously-unsupported currencies like JPY and INR', () => {
    expect(SUPPORTED_CURRENCIES.has('JPY')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('INR')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('KRW')).toBe(true);
    expect(SUPPORTED_CURRENCIES.has('BRL')).toBe(true);
  });

  it('rejects invalid currencies', () => {
    expect(SUPPORTED_CURRENCIES.has('XYZ')).toBe(false);
    expect(SUPPORTED_CURRENCIES.has('')).toBe(false);
  });

  it('is case-sensitive and expects uppercase', () => {
    expect(SUPPORTED_CURRENCIES.has('aud')).toBe(false);
    expect(SUPPORTED_CURRENCIES.has('aud'.toUpperCase())).toBe(true);
  });
});

describe('CURRENCY_OPTIONS', () => {
  it('has the same count as CURRENCY_LIST', () => {
    expect(CURRENCY_OPTIONS.length).toBe(CURRENCY_LIST.length);
  });

  it('keys match the data file codes', () => {
    const keys = CURRENCY_OPTIONS.map((c) => c.key);
    const dataCodes = CURRENCY_LIST.map((c) => c.code);
    expect(keys).toEqual(dataCodes);
  });

  it('each entry has key, i18nKey, and name', () => {
    for (const opt of CURRENCY_OPTIONS) {
      expect(opt.key).toBeTruthy();
      expect(opt.key).toMatch(/^[A-Z]{3}$/);
      expect(opt.i18nKey).toBeTruthy();
      expect(opt.i18nKey).toMatch(/^currency[A-Z]/);
      expect(opt.name).toBeTruthy();
    }
  });

  it('name matches the currency data', () => {
    const aud = CURRENCY_OPTIONS.find((c) => c.key === 'AUD');
    expect(aud?.name).toBe('Australian Dollar');
    const jpy = CURRENCY_OPTIONS.find((c) => c.key === 'JPY');
    expect(jpy?.name).toBe('Japanese Yen');
  });

  it('i18nKey follows pattern for known currencies', () => {
    const aud = CURRENCY_OPTIONS.find((c) => c.key === 'AUD');
    expect(aud?.i18nKey).toBe('currencyAud');
    const cny = CURRENCY_OPTIONS.find((c) => c.key === 'CNY');
    expect(cny?.i18nKey).toBe('currencyCny');
  });
});

describe('getCurrencySymbol', () => {
  it('should return € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('eur')).toBe('€');
  });

  it('should return £ for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('should return ¥ for JPY and CNY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
    expect(getCurrencySymbol('CNY')).toBe('¥');
  });

  it('should return ₩ for KRW', () => {
    expect(getCurrencySymbol('KRW')).toBe('₩');
  });

  it('should return ₹ for INR', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
  });

  it('should return ₽ for RUB', () => {
    expect(getCurrencySymbol('RUB')).toBe('₽');
  });

  it('should return $ for AUD, USD, CAD, NZD, SGD', () => {
    expect(getCurrencySymbol('AUD')).toBe('$');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('CAD')).toBe('$');
    expect(getCurrencySymbol('NZD')).toBe('$');
    expect(getCurrencySymbol('SGD')).toBe('$');
  });

  it('should return the code itself for currencies where symbol equals code', () => {
    // XAU has symbol 'XAU' in data (same as code), so we return the code
    expect(getCurrencySymbol('XAU')).toBe('XAU');
    expect(getCurrencySymbol('XAG')).toBe('XAG');
    expect(getCurrencySymbol('CHF')).toBe('CHF');
  });

  it('should return $ as ultimate fallback for unknown codes', () => {
    expect(getCurrencySymbol('UNKNOWN')).toBe('$');
    expect(getCurrencySymbol('XYZ')).toBe('$');
    expect(getCurrencySymbol('')).toBe('$');
  });

  it('handles lower-case input', () => {
    expect(getCurrencySymbol('eur')).toBe('€');
    expect(getCurrencySymbol('gbp')).toBe('£');
    expect(getCurrencySymbol('aud')).toBe('$');
  });
});

describe('formatCompactNumber', () => {
  it('should format billions with b suffix', () => {
    expect(formatCompactNumber(1_500_000_000)).toBe('1.5b');
    expect(formatCompactNumber(2_000_000_000)).toBe('2b');
  });

  it('should format millions with m suffix', () => {
    expect(formatCompactNumber(1_500_000)).toBe('1.5m');
    expect(formatCompactNumber(10_000_000)).toBe('10m');
  });

  it('should format thousands with k suffix', () => {
    expect(formatCompactNumber(1_500)).toBe('1.5k');
    expect(formatCompactNumber(10_000)).toBe('10k');
  });

  it('should format small numbers with toLocaleString', () => {
    const result = formatCompactNumber(999);
    expect(typeof result).toBe('string');
  });

  it('should handle negative numbers', () => {
    expect(formatCompactNumber(-1_500_000)).toBe('-1.5m');
    expect(formatCompactNumber(-2_000)).toBe('-2k');
  });

  it('should handle zero', () => {
    const result = formatCompactNumber(0);
    expect(typeof result).toBe('string');
  });

  it('should use Chinese 亿 for billions with zh locale', () => {
    expect(formatCompactNumber(1_500_000_000, 'zh')).toBe('15亿');
    expect(formatCompactNumber(2_000_000_000, 'zh')).toBe('20亿');
    expect(formatCompactNumber(150_000_000, 'zh')).toBe('1.5亿');
  });

  it('should use Chinese 万 for ten-thousands with zh locale', () => {
    expect(formatCompactNumber(15_000, 'zh')).toBe('1.5万');
    expect(formatCompactNumber(100_000, 'zh')).toBe('10万');
    expect(formatCompactNumber(9_999, 'zh')).toBe('9,999');
  });

  it('should handle negative numbers with zh locale', () => {
    expect(formatCompactNumber(-1_500_000, 'zh')).toBe('-150万');
    expect(formatCompactNumber(-15_000, 'zh')).toBe('-1.5万');
  });

  it('should handle zh-CN variant locale', () => {
    expect(formatCompactNumber(1_500_000, 'zh-CN')).toBe('150万');
    expect(formatCompactNumber(15_000, 'zh-CN')).toBe('1.5万');
  });

  it('should use default (k/m/b) for non-zh locales', () => {
    expect(formatCompactNumber(1_500_000, 'en')).toBe('1.5m');
    expect(formatCompactNumber(15_000, 'en')).toBe('15k');
    expect(formatCompactNumber(1_500_000_000, 'en')).toBe('1.5b');
  });
});
