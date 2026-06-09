'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';

type Locale = 'en' | 'zh';
const messages: Record<Locale, any> = { en, zh };
const LOCALE_COOKIE = 'netly_locale';

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

  const setAndPersist = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem(LOCALE_COOKIE, newLocale);
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
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
