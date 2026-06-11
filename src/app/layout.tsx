import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { cookies } from 'next/headers';

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
  const locale = cookieStore.get('netly_locale')?.value || 'en';
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
