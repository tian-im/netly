import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { cookies, headers } from 'next/headers';
import { parseAcceptLanguage } from '@/lib/locale';
import { PREFERENCES } from '@/lib/preferences';

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
  // WHY: We read the raw cookie instead of using the unified preference reader
  // because Accept-Language provides a better default than any hardcoded fallback.
  const cookieLocale = cookieStore.get(PREFERENCES.locale.key)?.value;
  const headerLocale = parseAcceptLanguage(headers().get('Accept-Language'));
  const locale = cookieLocale || headerLocale;
  return (
    <html lang={locale} data-theme="night" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full bg-base-300">
        <LayoutClient ssrLocale={locale}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
