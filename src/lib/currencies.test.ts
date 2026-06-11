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
});
