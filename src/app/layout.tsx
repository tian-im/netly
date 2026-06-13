import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { cookies, headers } from 'next/headers';

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

/**
 * Parse the Accept-Language header to extract the preferred locale.
 * Returns 'en' or 'zh' — all other values fall back to 'en'.
 *
 * Tie-breaking: In the sorted (highest quality first) list, 'zh' is checked
 * before 'en', so if a browser sends both with the same quality (q=1),
 * 'zh' is preferred. This matches the expectation that users who include
 * Chinese in their language preferences (even equally with English) intend
 * to see the Chinese UI.
 */
function parseAcceptLanguage(acceptLanguage: string | null): 'en' | 'zh' {
  if (!acceptLanguage) return 'en';
  // Parse quality-weighted list: "zh-CN,zh;q=0.9,en;q=0.8"
  const locales = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q = 'q=1'] = part.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 0;
      return { tag: tag.split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);
  // 'zh' is checked first intentionally — if both en and zh have the same
  // quality, zh wins (see doc comment above for rationale).
  for (const { tag } of locales) {
    if (tag === 'zh') return 'zh';
    if (tag === 'en') return 'en';
  }
  return 'en';
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('netly_locale')?.value;
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
