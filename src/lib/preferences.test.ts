import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PREFERENCES,
  getPreferenceFromCookies,
  getPreference,
  setPreference,
} from './preferences';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock Next.js cookie store (implements the ReadonlyRequestCookies API
 * surface that getPreferenceFromCookies needs).
 */
function createMockCookieStore(entries: Record<string, string>) {
  return {
    get: vi.fn((key: string) => {
      const val = entries[key];
      return val !== undefined ? { value: val, name: key } : undefined;
    }),
  };
}

/**
 * Clear all cookies by setting each one's expiry to the past.
 * jsdom does not provide a built-in cookie-store.clear().
 */
function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const eqIdx = c.indexOf('=');
    const name = eqIdx > 0 ? c.substring(0, eqIdx).trim() : c.trim();
    document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

// ---------------------------------------------------------------------------
// Tests: getPreferenceFromCookies (server-side)
// ---------------------------------------------------------------------------

describe('getPreferenceFromCookies', () => {
  it('returns the cookie value when present', () => {
    const store = createMockCookieStore({ netly_locale: 'zh' });
    expect(getPreferenceFromCookies(store, PREFERENCES.locale)).toBe('zh');
    expect(store.get).toHaveBeenCalledWith('netly_locale');
  });

  it('returns the default when the cookie is not set', () => {
    const store = createMockCookieStore({});
    expect(getPreferenceFromCookies(store, PREFERENCES.locale)).toBe('en');
    expect(store.get).toHaveBeenCalledWith('netly_locale');
  });

  it('returns the default when the cookie store returns undefined', () => {
    const store = { get: vi.fn().mockReturnValue(undefined) };
    expect(getPreferenceFromCookies(store, PREFERENCES.locale)).toBe('en');
  });

  it('works with non-locale preferences', () => {
    const store = createMockCookieStore({ netly_pref_default_currency: 'USD' });
    expect(getPreferenceFromCookies(store, PREFERENCES.defaultCurrency)).toBe('USD');
  });

  it('returns default for dateRange when not in cookies', () => {
    const store = createMockCookieStore({});
    expect(getPreferenceFromCookies(store, PREFERENCES.dateRange)).toBe('Month');
  });

  it('returns default for dateFormat when not in cookies', () => {
    const store = createMockCookieStore({});
    expect(getPreferenceFromCookies(store, PREFERENCES.dateFormat)).toBe('YYYY-MM-DD');
  });

  it('returns default for ruleMode when not in cookies', () => {
    const store = createMockCookieStore({});
    expect(getPreferenceFromCookies(store, PREFERENCES.ruleMode)).toBe('ask');
  });
});

// ---------------------------------------------------------------------------
// Tests: getPreference (client-side)
// ---------------------------------------------------------------------------

describe('getPreference (client-side)', () => {
  beforeEach(() => {
    clearCookies();
    localStorage.clear();
  });

  it('returns the cookie value when present', () => {
    document.cookie = 'netly_locale=zh;path=/';
    expect(getPreference(PREFERENCES.locale)).toBe('zh');
  });

  it('returns default when neither cookie nor localStorage has the value', () => {
    expect(getPreference(PREFERENCES.locale)).toBe('en');
  });

  it('returns default for currency when neither cookie nor localStorage has the value', () => {
    expect(getPreference(PREFERENCES.defaultCurrency)).toBe('AUD');
  });

  it('returns localStorage value when cookie is missing and syncs to cookie', () => {
    localStorage.setItem('netly_locale', 'zh');
    const result = getPreference(PREFERENCES.locale);
    expect(result).toBe('zh');
    // Should have been synced to cookie for future server reads
    expect(document.cookie).toContain('netly_locale=zh');
  });

  it('handles localStorage throwing gracefully', () => {
    document.cookie = 'netly_locale=en;path=/';
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });
    expect(getPreference(PREFERENCES.locale)).toBe('en');
    getItem.mockRestore();
  });

  it('handles both localStorage error and no cookie', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });
    expect(getPreference(PREFERENCES.locale)).toBe('en');
    getItem.mockRestore();
  });

  it('prefers cookie over localStorage when both are set', () => {
    localStorage.setItem('netly_locale', 'zh');
    document.cookie = 'netly_locale=en;path=/';
    expect(getPreference(PREFERENCES.locale)).toBe('en');
  });

  it('works with non-locale preferences', () => {
    document.cookie = 'netly_pref_default_currency=EUR;path=/';
    expect(getPreference(PREFERENCES.defaultCurrency)).toBe('EUR');
  });

  it('migrates localStorage-only currency value to cookie', () => {
    localStorage.setItem('netly_pref_default_currency', 'GBP');
    expect(getPreference(PREFERENCES.defaultCurrency)).toBe('GBP');
    expect(document.cookie).toContain('netly_pref_default_currency=GBP');
  });

  it('migrates localStorage-only dateRange value to cookie', () => {
    localStorage.setItem('netly_pref_default_date_range', '12m');
    expect(getPreference(PREFERENCES.dateRange)).toBe('12m');
    expect(document.cookie).toContain('netly_pref_default_date_range=12m');
  });

  it('returns default for unknown cookie-only values that do not exist', () => {
    // Ensure a different cookie doesn't interfere
    document.cookie = 'some_other_cookie=value;path=/';
    expect(getPreference(PREFERENCES.locale)).toBe('en');
  });

  it('handles document being undefined gracefully (SSR edge case)', () => {
    const originalDocument = globalThis.document;
    (globalThis as any).document = undefined;

    // Should return default without crashing when document is undefined
    expect(getPreference(PREFERENCES.locale)).toBe('en');

    (globalThis as any).document = originalDocument;
  });
});

// ---------------------------------------------------------------------------
// Tests: setPreference (client-side dual-write)
// ---------------------------------------------------------------------------

describe('setPreference', () => {
  beforeEach(() => {
    clearCookies();
    localStorage.clear();
  });

  it('writes to localStorage', () => {
    setPreference(PREFERENCES.locale, 'zh');
    expect(localStorage.getItem('netly_locale')).toBe('zh');
  });

  it('writes to document.cookie', () => {
    setPreference(PREFERENCES.locale, 'zh');
    expect(document.cookie).toContain('netly_locale=zh');
  });

  it('sets cookie path to / for global access', () => {
    setPreference(PREFERENCES.locale, 'zh');
    // jsdom stores the raw cookie string; we can check the value is present
    expect(document.cookie).toContain('netly_locale=zh');
  });

  it('writes different preference types', () => {
    setPreference(PREFERENCES.defaultCurrency, 'USD');
    expect(localStorage.getItem('netly_pref_default_currency')).toBe('USD');
    expect(document.cookie).toContain('netly_pref_default_currency=USD');

    setPreference(PREFERENCES.dateRange, '12m');
    expect(localStorage.getItem('netly_pref_default_date_range')).toBe('12m');
    expect(document.cookie).toContain('netly_pref_default_date_range=12m');
  });

  it('overwrites existing preferences', () => {
    setPreference(PREFERENCES.locale, 'zh');
    setPreference(PREFERENCES.locale, 'en');
    expect(localStorage.getItem('netly_locale')).toBe('en');
    expect(document.cookie).toContain('netly_locale=en');
  });

  it('handles localStorage throwing gracefully (still writes cookie)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    setPreference(PREFERENCES.locale, 'zh');
    // Cookie should still be written even if localStorage fails
    expect(document.cookie).toContain('netly_locale=zh');
    setItem.mockRestore();
  });

  it('handles document being undefined (guards against SSR edge cases)', () => {
    const originalDocument = globalThis.document;
    (globalThis as any).document = undefined;

    setPreference(PREFERENCES.locale, 'zh');
    // localStorage still works (it's on window, not document), but cookie
    // write is silently skipped. The main assertion is "no crash".
    expect(localStorage.getItem('netly_locale')).toBe('zh');

    (globalThis as any).document = originalDocument;
  });
});

// ---------------------------------------------------------------------------
// Tests: PREFERENCES structure and defaults
// ---------------------------------------------------------------------------

describe('PREFERENCES structure', () => {
  it('defines locale with expected key and default', () => {
    expect(PREFERENCES.locale.key).toBe('netly_locale');
    expect(PREFERENCES.locale.default).toBe('en');
  });

  it('defines defaultCurrency with expected key and default', () => {
    expect(PREFERENCES.defaultCurrency.key).toBe('netly_pref_default_currency');
    expect(PREFERENCES.defaultCurrency.default).toBe('AUD');
  });

  it('defines dateRange with expected key and default', () => {
    expect(PREFERENCES.dateRange.key).toBe('netly_pref_default_date_range');
    expect(PREFERENCES.dateRange.default).toBe('Month');
  });

  it('defines dateFormat with expected key and default', () => {
    expect(PREFERENCES.dateFormat.key).toBe('netly_pref_date_format');
    expect(PREFERENCES.dateFormat.default).toBe('YYYY-MM-DD');
  });

  it('defines ruleMode with expected key and default', () => {
    expect(PREFERENCES.ruleMode.key).toBe('netly_rule_mode');
    expect(PREFERENCES.ruleMode.default).toBe('ask');
  });

  it('all preference entries have the correct shape', () => {
    for (const [key, def] of Object.entries(PREFERENCES) as [string, { key: string; default: string }][]) {
      expect(typeof def.key).toBe('string');
      expect(def.key.startsWith('netly_')).toBe(true);
      expect(typeof def.default).toBe('string');
    }
  });
});
