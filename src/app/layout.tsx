import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';

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
  return (
    <html lang="en" data-theme="night" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full bg-base-300">
        <div className="drawer lg:drawer-open h-full">
          <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
          
          <div className="drawer-content flex flex-col h-full overflow-hidden">
            {/* Header / Navbar for Mobile view */}
            <div className="navbar bg-base-100 lg:hidden shadow-md shrink-0">
              <div className="flex-none">
                <label htmlFor="nav-drawer" className="btn btn-square btn-ghost drawer-button">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </label>
              </div>
              <div className="flex-1 px-2 mx-2 font-bold text-xl text-primary">
                Netly Ledger
              </div>
            </div>

            {/* Main scrollable page workspace */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
              {children}
            </main>
          </div>

          {/* Drawer Sidebar for Desktop and Mobile overlays */}
          <div className="drawer-side shrink-0 z-50">
            <label htmlFor="nav-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
            <div className="menu p-4 w-72 min-h-full bg-base-100 text-base-content flex flex-col justify-between shadow-2xl">
              <div>
                <div className="px-4 py-6 text-center lg:text-left">
                  <h1 className="text-2xl font-black tracking-wider text-primary">
                    NETLY LEDGER
                  </h1>
                  <p className="text-xs text-base-content/60 uppercase tracking-widest mt-1">
                    Personal Financial Engine
                  </p>
                </div>
                
                <ul className="space-y-1 mt-4">
                  <li>
                    <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>📊</span> Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/accounts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>💰</span> Accounts
                    </Link>
                  </li>
                  <li>
                    <Link href="/import" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>📥</span> Bank CSV Import
                    </Link>
                  </li>
                  <li>
                    <Link href="/transactions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>🗂️</span> Transaction Ledger
                    </Link>
                  </li>
                  <li>
                    <Link href="/reports" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>📈</span> Financial Statements
                    </Link>
                  </li>
                  <li>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
                      <span>⚙️</span> Settings
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Sidebar footer showing Local Run status */}
              <div className="px-4 py-4 bg-base-200/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-success uppercase tracking-wider">
                    Running Locally
                  </span>
                </div>
                <p className="text-[10px] text-base-content/50 mt-1">
                  SQLite database: prisma/dev.db
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
