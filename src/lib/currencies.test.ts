import { describe, it, expect } from 'vitest';
import { getCurrencySymbol } from './currencies';

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
