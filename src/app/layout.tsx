import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { cookies, headers } from 'next/headers';
import { parseAcceptLanguage } from '@/lib/locale';
import { PREFERENCES, getPreferenceFromCookies } from '@/lib/preferences';

export const metadata: Metadata = {
  title: 'Netly Ledger - Financial Statements & Bank CSV Analyzer',
  description: 'Parse bank statement CSV files and compile Balance Sheet, Income & Expense, and Cash Flow statements locally.',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  // WHY: We read the cookie key from PREFERENCES to keep it centralised, but
  // still fall back to Accept-Language for first-time visitors who haven't set
  // a preference yet. getPreferenceFromCookies has a hardcoded default that
  // would bypass the browser-language check, so we read the raw cookie instead.
  const cookieLocale = cookieStore.get(PREFERENCES.locale.key)?.value;
  const headerLocale = parseAcceptLanguage(headers().get('Accept-Language'));
  const locale = cookieLocale || headerLocale;
  const theme = cookieStore.get('netly_theme')?.value || 'night';

  return (
    <html lang={locale} data-theme={theme} className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full bg-base-300">
        <LayoutClient ssrLocale={locale} ssrTheme={theme}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
