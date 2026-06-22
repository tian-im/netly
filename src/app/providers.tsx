'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/lib/locale';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import zhTW from '../../messages/zh-TW.json';
import ja from '../../messages/ja.json';
import ko from '../../messages/ko.json';
import { PREFERENCES, setPreference } from '@/lib/preferences';

const messages: Record<Locale, any> = { en, zh, 'zh-TW': zhTW, ja, ko };

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: 'en', setLocale: () => {} });

// WHY: Map document titles per locale for browser tab display.
// zh and zh-TW share Chinese title; ja and ko get their own localized titles.
const DOCUMENT_TITLES: Record<Locale, string> = {
  en: 'Netly Ledger - Financial Statements & Bank CSV Analyzer',
  zh: 'Netly Ledger - 财务报表与银行 CSV 分析工具',
  'zh-TW': 'Netly Ledger - 財務報表與銀行CSV分析工具',
  ja: 'Netly Ledger - 財務諸表と銀行CSV分析ツール',
  ko: 'Netly Ledger - 재무제표 및 은행 CSV 분석기',
};

export function LocaleProvider({ children, ssrLocale = 'en' }: { children: ReactNode; ssrLocale?: string }) {
  const [locale, setLocale] = useState<Locale>(ssrLocale as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = DOCUMENT_TITLES[locale] ?? DOCUMENT_TITLES.en;
  }, [locale]);

  // WHY: One-time cleanup for the legacy netly_theme cookie/localStorage key
  // that existed before the theme was removed. Harmless if already gone.
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
