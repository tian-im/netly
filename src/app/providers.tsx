'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import { PREFERENCES, setPreference } from '@/lib/preferences';

type Locale = 'en' | 'zh';
type Theme = 'night' | 'light';
const messages: Record<Locale, any> = { en, zh };
const THEME_COOKIE = 'netly_theme';

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: 'en', setLocale: () => {} });

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}>({ theme: 'night', setTheme: () => {}, toggleTheme: () => {} });

export function LocaleProvider({ children, ssrLocale = 'en', ssrTheme = 'night' }: { children: ReactNode; ssrLocale?: string; ssrTheme?: string }) {
  const [locale, setLocale] = useState<Locale>(ssrLocale as Locale);
  const [theme, setThemeState] = useState<Theme>(ssrTheme as Theme);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from cookie / localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_COOKIE);
    const initialTheme = (stored === 'light' || stored === 'night') ? stored : (ssrTheme === 'light' ? 'light' : 'night') as Theme;
    setThemeState(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, [ssrTheme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === 'zh') {
      document.title = 'Netly Ledger - 财务报表与银行 CSV 分析工具';
    } else {
      document.title = 'Netly Ledger - Financial Statements & Bank CSV Analyzer';
    }
  }, [locale]);

  // WHY: Using the unified setPreference ensures consistent dual-write to
  // localStorage and cookie, with the cookie key defined in one place (PREFERENCES).
  const setAndPersist = (newLocale: Locale) => {
    setLocale(newLocale);
    setPreference(PREFERENCES.locale, newLocale);
  };

  // Theme is excluded from the preferences refactor (per plan). It already has
  // cookie-first behavior via a different mechanism. The dual-write stays as-is.
  const setAndPersistTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_COOKIE, newTheme);
    document.cookie = `${THEME_COOKIE}=${newTheme};path=/;max-age=31536000;SameSite=Lax`;
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setAndPersistTheme(theme === 'night' ? 'light' : 'night');
  }, [theme, setAndPersistTheme]);

  // Apply theme on mount to prevent flash
  if (!mounted) {
    // Render children with default theme — hydration will correct
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setAndPersistTheme, toggleTheme }}>
      <LocaleContext.Provider value={{ locale, setLocale: setAndPersist }}>
        <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
          {children}
        </NextIntlClientProvider>
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}

export const useLocaleContext = () => useContext(LocaleContext);
export const useThemeContext = () => useContext(ThemeContext);
