import { describe, it, expect } from 'vitest';
import { formatDateISO } from './dates';

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
    // If somehow a weird object causes toISOString to throw
    const badObj = {
      toISOString() {
        throw new Error('boom');
      }
    };
    expect(formatDateISO(badObj as any)).toBe('');
    expect(formatDateISO(Symbol('test') as any)).toBe('');
  });
});
