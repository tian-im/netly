import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDateISO,
  getPreferredDateRange,
  mapPreferenceToDashboardPeriod,
  mapPreferenceToTransactionPeriod,
  DATE_RANGE_TO_PERIOD_TYPE,
} from './dates';

describe('formatDateISO', () => {
  it('formats Date object correctly', () => {
    const date = new Date(Date.UTC(2026, 5, 17)); // June 17, 2026 UTC
    expect(formatDateISO(date)).toBe('2026-06-17');
  });

  it('formats ISO string correctly', () => {
    expect(formatDateISO('2026-06-09T00:00:00.000Z')).toBe('2026-06-09');
  });

  it('formats epoch timestamp correctly', () => {
    const timestamp = Date.UTC(2026, 5, 9);
    expect(formatDateISO(timestamp)).toBe('2026-06-09');
  });

  it('defaults to today when no arguments are passed', () => {
    const formatted = formatDateISO();
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const todayStr = new Date().toISOString().split('T')[0];
    expect(formatted).toBe(todayStr);
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDateISO('invalid-date-string')).toBe('');
    expect(formatDateISO(NaN)).toBe('');
  });

  it('handles errors gracefully and returns empty string', () => {
    const badObj = {
      toISOString() {
        throw new Error('boom');
      }
    };
    expect(formatDateISO(badObj as any)).toBe('');
    expect(formatDateISO(Symbol('test') as any)).toBe('');
  });
});

describe('getPreferredDateRange', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.restoreAllMocks();
  });

  it('returns Month during SSR (no window)', () => {
    expect(getPreferredDateRange()).toBe('Month');
  });

  it('returns stored value when localStorage has a valid range preference', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue('3m');
    Storage.prototype.getItem = getItem;
    expect(getPreferredDateRange()).toBe('3m');
    expect(getItem).toHaveBeenCalledWith('netly_pref_default_date_range');
  });

  it('returns Month fallback when localStorage has an invalid value', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue('invalidRange');
    Storage.prototype.getItem = getItem;
    expect(getPreferredDateRange()).toBe('Month');
  });

  it('returns Month when localStorage is empty', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockReturnValue(null);
    Storage.prototype.getItem = getItem;
    expect(getPreferredDateRange()).toBe('Month');
  });

  it('handles localStorage throwing gracefully', () => {
    vi.stubGlobal('window', {});
    const getItem = vi.fn().mockImplementation(() => { throw new Error('localStorage error'); });
    Storage.prototype.getItem = getItem;
    expect(getPreferredDateRange()).toBe('Month');
  });
});

describe('mapping functions', () => {
  it('maps preference to dashboard period correctly', () => {
    expect(mapPreferenceToDashboardPeriod('Month')).toBe('current');
    expect(mapPreferenceToDashboardPeriod('3m')).toBe('3m');
    expect(mapPreferenceToDashboardPeriod('6m')).toBe('6m');
    expect(mapPreferenceToDashboardPeriod('ytd')).toBe('ytd');
    expect(mapPreferenceToDashboardPeriod('12m')).toBe('12m');
  });

  it('falls back to current for unknown preference values', () => {
    // Defensive fallback for unexpected/corrupt cookie values.
    expect(mapPreferenceToDashboardPeriod('unknown')).toBe('current');
    expect(mapPreferenceToDashboardPeriod('')).toBe('current');
    expect(mapPreferenceToDashboardPeriod('invalidRange')).toBe('current');
  });

  it('maps preference to transactions period correctly', () => {
    expect(mapPreferenceToTransactionPeriod('Month')).toBe('month');
    expect(mapPreferenceToTransactionPeriod('3m')).toBe('threeMonths');
    expect(mapPreferenceToTransactionPeriod('6m')).toBe('sixMonths');
    expect(mapPreferenceToTransactionPeriod('12m')).toBe('twelveMonths');
    expect(mapPreferenceToTransactionPeriod('ytd')).toBe('ytd');
  });

  it('falls back to month for unknown preference values (default branch)', () => {
    // The default branch exists as a runtime safety net for unexpected values.
    // This would only be hit if code bypasses TypeScript type checking.
    expect(mapPreferenceToTransactionPeriod('unknown')).toBe('month');
  });
});

describe('DATE_RANGE_TO_PERIOD_TYPE', () => {
  it('maps each FilterBar dateRange value to the correct PeriodType', () => {
    expect(DATE_RANGE_TO_PERIOD_TYPE.month).toBe('current');
    expect(DATE_RANGE_TO_PERIOD_TYPE.threeMonths).toBe('3m');
    expect(DATE_RANGE_TO_PERIOD_TYPE.sixMonths).toBe('6m');
    expect(DATE_RANGE_TO_PERIOD_TYPE.twelveMonths).toBe('12m');
    expect(DATE_RANGE_TO_PERIOD_TYPE.ytd).toBe('ytd');
  });

  it('maps are inverse of mapPreferenceToTransactionPeriod via PreferenceDateRange round-trip', () => {
    // For each PreferenceDateRange value, mapping through
    // PreferenceDateRange → FilterBar value → PeriodType should give
    // the same result as mapPreferenceToDashboardPeriod.
    const testCases: Array<[string, string]> = [
      ['Month', 'current'],
      ['3m', '3m'],
      ['6m', '6m'],
      ['12m', '12m'],
      ['ytd', 'ytd'],
    ];
    for (const [pref, expectedPeriod] of testCases) {
      const filterBarValue = mapPreferenceToTransactionPeriod(pref);
      const periodType = DATE_RANGE_TO_PERIOD_TYPE[filterBarValue];
      expect(periodType).toBe(expectedPeriod);
    }
  });

  it('returns undefined for unknown dateRange values', () => {
    expect(DATE_RANGE_TO_PERIOD_TYPE['unknown' as keyof typeof DATE_RANGE_TO_PERIOD_TYPE]).toBeUndefined();
  });
});
