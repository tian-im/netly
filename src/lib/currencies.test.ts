import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, formatCompactNumber } from './currencies';

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

  it('should return $ as default', () => {
    expect(getCurrencySymbol('AUD')).toBe('$');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('UNKNOWN')).toBe('$');
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
