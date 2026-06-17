/**
 * Unified user-preference utility: cookie-first with localStorage fallback.
 *
 * Read hierarchy (client-side):
 *   1. cookie → 2. localStorage → 3. default
 *
 * Write strategy:
 *   - Dual-write to BOTH localStorage and cookie on every set.
 *   - On read, if a value exists only in localStorage, sync it to cookie
 *     (one-time migration for existing users).
 *
 * Server components use getPreferenceFromCookies() which reads only the cookie.
 * Client components use getPreference() / setPreference().
 *
 * WHY: This replaces scattered, inconsistent patterns across currencies.ts,
 * dates.ts, providers.tsx, and PreferencesCard.tsx. A single module ensures
 * every preference is read/written the same way, and server components can
 * render with the user's actual preferences on the first request (eliminating
 * hydration mismatches and useEffect-driven re-renders).
 */

// ---------------------------------------------------------------------------
// Preference definitions
//
// WHY: The default currency is hardcoded as 'AUD' (matching DEFAULT_CURRENCY
// in currencies.ts) to avoid a circular dependency: preferences.ts cannot
// import from currencies.ts because currencies.ts now imports from here.
// If DEFAULT_CURRENCY changes, update both places.
// ---------------------------------------------------------------------------

export const PREFERENCES = {
  locale:          { key: 'netly_locale',                   default: 'en' },
  defaultCurrency: { key: 'netly_pref_default_currency',   default: 'AUD' },
  dateRange:       { key: 'netly_pref_default_date_range',  default: 'Month' },
  dateFormat:      { key: 'netly_pref_date_format',         default: 'YYYY-MM-DD' },
  ruleMode:        { key: 'netly_rule_mode',                default: 'ask' },
} as const;

export type PreferenceKey = keyof typeof PREFERENCES;
export type PreferenceDef = (typeof PREFERENCES)[PreferenceKey];

// ---------------------------------------------------------------------------
// Server-side reader
// ---------------------------------------------------------------------------

/**
 * Read a user preference from a Next.js cookie store (server components only).
 *
 * @param cookieStore - The object returned by `cookies()` from `next/headers`.
 * @param pref        - The preference definition from `PREFERENCES`.
 * @returns The stored value or the default.
 */
export function getPreferenceFromCookies(
  cookieStore: { get: (name: string) => { value: string } | undefined },
  pref: PreferenceDef,
): string {
  const cookie = cookieStore.get(pref.key);
  return cookie?.value ?? pref.default;
}

// ---------------------------------------------------------------------------
// Client-side helpers
// ---------------------------------------------------------------------------

/**
 * Read the value of a named cookie from `document.cookie`.
 * Returns `undefined` if not found.
 */
function getCookieValue(key: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  // document.cookie format: "key1=val1; key2=val2"
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegex(key)}=([^;]*)`));
  return match ? match[1] : undefined;
}

/**
 * Escape special regex characters in a string for use in RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Set a cookie with standard options: site-wide path, 1-year max-age, Lax
 * SameSite so it is sent on same-site navigation requests.
 *
 * WHY: 1-year max-age keeps preferences alive across browser restarts without
 * requiring a "Remember me" toggle. SameSite=Lax is the default in modern
 * browsers and matches the security posture of the existing cookie writes.
 */
function setCookie(key: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${key}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Client-side reader / writer
// ---------------------------------------------------------------------------

/**
 * Read a user preference in a client-side environment.
 *
 * Order: cookie → localStorage → default.
 *
 * If the value is found in localStorage but NOT in the cookie, it syncs the
 * value to a cookie (one-time migration for existing users) then returns it.
 *
 * @param pref - The preference definition from `PREFERENCES`.
 * @returns The stored value or the default.
 */
export function getPreference(pref: PreferenceDef): string {
  // 1. Cookie first — server may have set it on a previous response
  const cookieVal = getCookieValue(pref.key);
  if (cookieVal !== undefined) return cookieVal;

  // 2. localStorage fallback (legacy users who only have localStorage)
  try {
    const stored = localStorage.getItem(pref.key);
    if (stored !== null) {
      // Sync to cookie so future server reads also pick it up
      setCookie(pref.key, stored);
      return stored;
    }
  } catch {
    // localStorage may throw in some environments (private browsing, storage
    // full, or SSR-like conditions where `window` exists but Storage is restricted)
  }

  // 3. Default fallback
  return pref.default;
}

/**
 * Persist a user preference in both localStorage and cookie (dual-write).
 *
 * This ensures that:
 * - Server components can read the value on the next request (cookie).
 * - The value survives in the browser if cookies are cleared (localStorage).
 *
 * @param pref  - The preference definition from `PREFERENCES`.
 * @param value - The value to persist.
 */
export function setPreference(pref: PreferenceDef, value: string): void {
  try {
    localStorage.setItem(pref.key, value);
  } catch {
    // localStorage may throw in restricted environments; still try the cookie
  }
  setCookie(pref.key, value);
}
