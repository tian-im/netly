import { describe, it, expect } from 'vitest';
import {
  getPeriodDateRange,
  getPeriodDates,
  buildReportsUrl,
  buildAccountTransactionsUrl,
  buildCategoryTransactionsUrl,
  buildDashboardUrl,
  buildAccountsUrl,
  buildImportUrl,
  buildTransactionsUrl,
  buildLoginUrl,
  buildSetupUrl,
  buildCategoriesUrl,
  buildSettingsUrl,
} from './links';

describe('getPeriodDates', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('should return current month boundaries', () => {
    const d = getPeriodDates('current', now);
    expect(d.firstDay).toEqual(new Date('2026-06-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    // prior period: previous month
    expect(d.prevPeriodStart).toEqual(new Date('2026-05-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2026-05-31T00:00:00.000Z'));
  });

  it('should return trailing 3-month boundaries', () => {
    const d = getPeriodDates('3m', now);
    expect(d.firstDay).toEqual(new Date('2026-04-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    // prior period: 3 months before firstDay → Jan 1 – Mar 31
    expect(d.prevPeriodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2026-03-31T00:00:00.000Z'));
  });

  it('should return trailing 6-month boundaries', () => {
    const d = getPeriodDates('6m', now);
    expect(d.firstDay).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    // prior period: 6 months before firstDay → July 1 – Dec 31, 2025
    expect(d.prevPeriodStart).toEqual(new Date('2025-07-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2025-12-31T00:00:00.000Z'));
  });

  it('should return YTD boundaries', () => {
    const d = getPeriodDates('ytd', now);
    expect(d.firstDay).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    // prior period: same window in previous year
    expect(d.prevPeriodStart).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2025-06-15T00:00:00.000Z'));
  });

  it('should return trailing 12-month boundaries', () => {
    const d = getPeriodDates('12m', now);
    expect(d.firstDay).toEqual(new Date('2025-07-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    // prior period: 12 months before firstDay → July 1, 2024 – June 30, 2025
    expect(d.prevPeriodStart).toEqual(new Date('2024-07-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2025-06-30T00:00:00.000Z'));
  });

  it('should handle January current month', () => {
    const janNow = new Date('2026-01-10T00:00:00.000Z');
    const d = getPeriodDates('current', janNow);
    expect(d.firstDay).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    expect(d.prevPeriodStart).toEqual(new Date('2025-12-01T00:00:00.000Z'));
    expect(d.prevPeriodEnd).toEqual(new Date('2025-12-31T00:00:00.000Z'));
  });

  it('should handle year boundary for trailing 12 months', () => {
    const febNow = new Date('2026-02-10T00:00:00.000Z');
    const d = getPeriodDates('12m', febNow);
    expect(d.firstDay).toEqual(new Date('2025-03-01T00:00:00.000Z'));
    expect(d.lastDay).toEqual(new Date('2026-02-28T00:00:00.000Z'));
  });
});

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

  it('should return /reports with no args for static nav links', () => {
    expect(buildReportsUrl()).toBe('/reports');
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

describe('buildDashboardUrl', () => {
  it('should return home path when no params', () => {
    expect(buildDashboardUrl()).toBe('/');
  });

  it('should append URLSearchParams as query string', () => {
    const params = new URLSearchParams({ period: '3m' });
    expect(buildDashboardUrl(params)).toBe('/?period=3m');
  });

  it('should accept a string as query string', () => {
    expect(buildDashboardUrl('period=6m')).toBe('/?period=6m');
  });

  it('should handle multiple query params', () => {
    const params = new URLSearchParams({ period: 'ytd', cur: 'USD' });
    const url = buildDashboardUrl(params);
    expect(url).toContain('period=ytd');
    expect(url).toContain('cur=USD');
    expect(url.startsWith('/?')).toBe(true);
  });
});

describe('buildAccountsUrl', () => {
  it('should return /accounts', () => {
    expect(buildAccountsUrl()).toBe('/accounts');
  });
});

describe('buildImportUrl', () => {
  it('should return /import', () => {
    expect(buildImportUrl()).toBe('/import');
  });
});

describe('buildTransactionsUrl', () => {
  it('should return /transactions when no filter', () => {
    expect(buildTransactionsUrl()).toBe('/transactions');
  });

  it('should map uncategorized to isReviewed=false', () => {
    expect(buildTransactionsUrl('uncategorized')).toBe('/transactions?isReviewed=false');
  });

  it('should ignore unknown filter values and return bare /transactions', () => {
    expect(buildTransactionsUrl('needs review')).toBe('/transactions');
    expect(buildTransactionsUrl('foo')).toBe('/transactions');
  });
});

describe('buildLoginUrl', () => {
  it('should return /login', () => {
    expect(buildLoginUrl()).toBe('/login');
  });
});

describe('buildSetupUrl', () => {
  it('should return /setup without token', () => {
    expect(buildSetupUrl()).toBe('/setup');
  });

  it('should return /setup?setupToken=1 with token', () => {
    expect(buildSetupUrl(true)).toBe('/setup?setupToken=1');
  });

  it('should default to undefined (no token)', () => {
    expect(buildSetupUrl(false)).toBe('/setup');
  });
});

describe('buildCategoriesUrl', () => {
  it('should return /categories', () => {
    expect(buildCategoriesUrl()).toBe('/categories');
  });
});

describe('buildSettingsUrl', () => {
  it('should return /settings', () => {
    expect(buildSettingsUrl()).toBe('/settings');
  });
});
