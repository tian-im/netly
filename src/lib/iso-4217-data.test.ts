import { describe, it, expect } from 'vitest';
import {
  isValidCurrencyCode,
  getCurrencyInfo,
  CURRENCY_LIST,
  VALID_CURRENCY_CODES,
  CURRENCIES,
} from './iso-4217-data';

describe('VALID_CURRENCY_CODES', () => {
  it('contains all 8 currently-supported codes (AUD, USD, EUR, GBP, SGD, NZD, CAD, CNY)', () => {
    expect(VALID_CURRENCY_CODES.has('AUD')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('USD')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('EUR')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('GBP')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('SGD')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('NZD')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('CAD')).toBe(true);
    expect(VALID_CURRENCY_CODES.has('CNY')).toBe(true);
  });

  it('contains 180+ active currency codes', () => {
    // There are ~180 active ISO 4217 codes; we should have at least 170
    expect(VALID_CURRENCY_CODES.size).toBeGreaterThanOrEqual(170);
  });
});

describe('isValidCurrencyCode', () => {
  it('returns true for valid codes (case-insensitive)', () => {
    expect(isValidCurrencyCode('AUD')).toBe(true);
    expect(isValidCurrencyCode('aud')).toBe(true);
    expect(isValidCurrencyCode('Aud')).toBe(true);
    expect(isValidCurrencyCode('EUR')).toBe(true);
    expect(isValidCurrencyCode('jpy')).toBe(true);
    expect(isValidCurrencyCode('JPY')).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidCurrencyCode('')).toBe(false);
    expect(isValidCurrencyCode('XYZ')).toBe(false);
    expect(isValidCurrencyCode('JP')).toBe(false);
    expect(isValidCurrencyCode('FOOBAR')).toBe(false);
    expect(isValidCurrencyCode('123')).toBe(false);
  });

  it('handles whitespace trimming', () => {
    expect(isValidCurrencyCode('  aud  ')).toBe(true);
    expect(isValidCurrencyCode('  USD  ')).toBe(true);
  });
});

describe('getCurrencyInfo', () => {
  it('returns correct data for known codes', () => {
    const aud = getCurrencyInfo('AUD');
    expect(aud).toBeDefined();
    expect(aud?.code).toBe('AUD');
    expect(aud?.numeric).toBe(36);
    expect(aud?.name).toBe('Australian Dollar');
    expect(aud?.symbol).toBe('$');
    expect(aud?.minorUnit).toBe(2);

    const eur = getCurrencyInfo('EUR');
    expect(eur).toBeDefined();
    expect(eur?.code).toBe('EUR');
    expect(eur?.numeric).toBe(978);
    expect(eur?.name).toBe('Euro');
    expect(eur?.symbol).toBe('€');
    expect(eur?.minorUnit).toBe(2);

    const jpy = getCurrencyInfo('JPY');
    expect(jpy).toBeDefined();
    expect(jpy?.code).toBe('JPY');
    expect(jpy?.numeric).toBe(392);
    expect(jpy?.name).toBe('Japanese Yen');
    expect(jpy?.symbol).toBe('¥');
    expect(jpy?.minorUnit).toBe(0);

    const cny = getCurrencyInfo('CNY');
    expect(cny).toBeDefined();
    expect(cny?.code).toBe('CNY');
    expect(cny?.name).toBe('Chinese Yuan');
    expect(cny?.symbol).toBe('¥');
  });

  it('returns undefined for unknown codes', () => {
    expect(getCurrencyInfo('')).toBeUndefined();
    expect(getCurrencyInfo('XYZ')).toBeUndefined();
    expect(getCurrencyInfo('FOO')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    const aud1 = getCurrencyInfo('AUD');
    const aud2 = getCurrencyInfo('aud');
    const aud3 = getCurrencyInfo('Aud');
    expect(aud1).toEqual(aud2);
    expect(aud1).toEqual(aud3);
  });
});

describe('CURRENCY_LIST', () => {
  it('is sorted alphabetically by code', () => {
    for (let i = 1; i < CURRENCY_LIST.length; i++) {
      expect(CURRENCY_LIST[i].code.localeCompare(CURRENCY_LIST[i - 1].code)).toBeGreaterThanOrEqual(0);
    }
  });

  it('contains all entries from CURRENCIES', () => {
    expect(CURRENCY_LIST.length).toBe(Object.keys(CURRENCIES).length);
    const listCodes = new Set(CURRENCY_LIST.map((c) => c.code));
    expect(listCodes).toEqual(new Set(Object.keys(CURRENCIES)));
  });
});

describe('all entries have valid structure', () => {
  it('all entries have exactly 3 uppercase-letter codes', () => {
    for (const [code, info] of Object.entries(CURRENCIES)) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(info.code).toBe(code);
    }
  });

  it('all entries have non-empty name', () => {
    for (const info of Object.values(CURRENCIES)) {
      expect(info.name).toBeTruthy();
      expect(info.name.length).toBeGreaterThan(0);
    }
  });

  it('all entries have non-empty symbol', () => {
    for (const info of Object.values(CURRENCIES)) {
      expect(info.symbol).toBeTruthy();
      expect(info.symbol.length).toBeGreaterThan(0);
    }
  });

  it('all entries have a non-negative minorUnit', () => {
    for (const info of Object.values(CURRENCIES)) {
      expect(info.minorUnit).toBeGreaterThanOrEqual(0);
    }
  });

  it('all entries have a positive numeric code', () => {
    for (const info of Object.values(CURRENCIES)) {
      expect(info.numeric).toBeGreaterThan(0);
    }
  });

  it('VALID_CURRENCY_CODES matches CURRENCIES keys', () => {
    expect(VALID_CURRENCY_CODES).toEqual(new Set(Object.keys(CURRENCIES)));
  });
});
