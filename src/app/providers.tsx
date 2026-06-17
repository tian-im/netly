'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import { PREFERENCES, setPreference } from '@/lib/preferences';

type Locale = 'en' | 'zh';
const messages: Record<Locale, any> = { en, zh };

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: 'en', setLocale: () => {} });

export function LocaleProvider({ children, ssrLocale = 'en' }: { children: ReactNode; ssrLocale?: string }) {
  const [locale, setLocale] = useState<Locale>(ssrLocale as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === 'zh') {
      document.title = 'Netly Ledger - 财务报表与银行 CSV 分析工具';
    } else {
      document.title = 'Netly Ledger - Financial Statements & Bank CSV Analyzer';
    }
  }, [locale]);

  // WHY: One-time cleanup for the old netly_theme cookie/localStorage key that
  // existed before the night-only consolidation. Harmless if already removed.
  useEffect(() => {
    localStorage.removeItem('netly_theme');
    document.cookie = 'netly_theme=;path=/;max-age=0;SameSite=Lax';
  }, []);

  // WHY: Using the unified setPreference ensures consistent dual-write to
  // localStorage and cookie, with the cookie key defined in one place (PREFERENCES).
  const setAndPersist = (newLocale: Locale) => {
    setLocale(newLocale);
    setPreference(PREFERENCES.locale, newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setAndPersist }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export const useLocaleContext = () => useContext(LocaleContext);
