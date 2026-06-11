import { describe, it, expect } from 'vitest';
import { getPeriodDateRange, buildReportsUrl, buildAccountTransactionsUrl, buildCategoryTransactionsUrl } from './links';

describe('getPeriodDateRange', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('should return current month range', () => {
    const range = getPeriodDateRange('current', now);
    expect(range.start).toBe('2026-06-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should return trailing 3-month range', () => {
    const range = getPeriodDateRange('3m', now);
    expect(range.start).toBe('2026-04-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should return trailing 6-month range', () => {
    const range = getPeriodDateRange('6m', now);
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should return YTD range', () => {
    const range = getPeriodDateRange('ytd', now);
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should return trailing 12-month range', () => {
    const range = getPeriodDateRange('12m', now);
    expect(range.start).toBe('2025-07-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should handle January current month correctly', () => {
    const janNow = new Date('2026-01-10T00:00:00.000Z');
    const range = getPeriodDateRange('current', janNow);
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-01-31');
  });

  it('should handle year boundary for trailing 12 months', () => {
    const febNow = new Date('2026-02-10T00:00:00.000Z');
    const range = getPeriodDateRange('12m', febNow);
    expect(range.start).toBe('2025-03-01');
    expect(range.end).toBe('2026-02-28');
  });
});

describe('buildReportsUrl', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('should build a URL with start and end params', () => {
    const url = buildReportsUrl('current', now);
    expect(url).toBe('/reports?start=2026-06-01&end=2026-06-30');
  });

  it('should include currency when provided', () => {
    const url = buildReportsUrl('current', now, 'USD');
    expect(url).toContain('cur=USD');
  });

  it('should include start and end for 3m period', () => {
    const url = buildReportsUrl('3m', now);
    expect(url).toContain('start=2026-04-01');
    expect(url).toContain('end=2026-06-30');
  });
});

describe('buildAccountTransactionsUrl', () => {
  it('should build URL with accountId param', () => {
    const url = buildAccountTransactionsUrl('acc_123');
    expect(url).toBe('/transactions?accountId=acc_123');
  });

  it('should encode special characters in account ID', () => {
    const url = buildAccountTransactionsUrl('acc/1');
    expect(url).toBe('/transactions?accountId=acc%2F1');
  });

  it('should encode spaces in account ID', () => {
    const url = buildAccountTransactionsUrl('my account');
    expect(url).toBe('/transactions?accountId=my%20account');
  });
});

describe('buildCategoryTransactionsUrl', () => {
  it('should build URL with categoryId param', () => {
    const url = buildCategoryTransactionsUrl('cat_salary');
    expect(url).toBe('/transactions?categoryId=cat_salary');
  });

  it('should encode special characters in category ID', () => {
    const url = buildCategoryTransactionsUrl('cat & more');
    expect(url).toBe('/transactions?categoryId=cat%20%26%20more');
  });
});
