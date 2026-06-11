'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, FolderTree, TrendingUp, Settings } from 'lucide-react';
import { LocaleProvider } from './providers';
import Sidebar from './sidebar';
import { useTranslations } from 'next-intl';

function MobileNavBrand() {
  const t = useTranslations('nav');
  return (
    <div className="flex-1 px-2 mx-2 font-bold text-xl text-primary">
      {t('brand')}
    </div>
  );
}

/** Bottom navigation items for mobile (5 most important pages) */
const btmNavItems = [
  { href: '/',             labelKey: 'dashboard',    icon: LayoutDashboard },
  { href: '/accounts',     labelKey: 'accounts',     icon: Wallet         },
  { href: '/transactions', labelKey: 'transactions', icon: FolderTree     },
  { href: '/reports',      labelKey: 'reports',      icon: TrendingUp     },
  { href: '/settings',     labelKey: 'settings',     icon: Settings       },
] as const;

function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <div className="btm-nav btm-nav-sm lg:hidden border-t border-base-300 bg-base-100 z-40 shrink-0">
      {btmNavItems.map(({ href, labelKey, icon: Icon }) => {
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={isActive ? 'active text-primary' : 'text-base-content/60'}
          >
            <Icon className="h-5 w-5" />
            <span className="btm-nav-label text-[10px] leading-tight">{t(labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function LayoutClient({ children, ssrLocale, ssrTheme }: { children: React.ReactNode; ssrLocale?: string; ssrTheme?: string }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname === '/setup';

  if (isPublicPage) {
    return (
      <LocaleProvider ssrLocale={ssrLocale} ssrTheme={ssrTheme}>
        {children}
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider ssrLocale={ssrLocale} ssrTheme={ssrTheme}>
      <div className="drawer lg:drawer-open h-full">
        <input id="nav-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col h-full overflow-hidden">
          <div className="navbar bg-base-100 lg:hidden shadow-md shrink-0">
            <div className="flex-none">
              <label htmlFor="nav-drawer" className="btn btn-square btn-ghost drawer-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </label>
            </div>
            <MobileNavBrand />
          </div>

          <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-8 lg:pb-8">
            {children}
          </main>

          {/* Mobile Bottom Tab Bar */}
          <BottomNav />
        </div>

        <div className="drawer-side shrink-0 z-50">
          <label htmlFor="nav-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <Sidebar />
        </div>
      </div>
    </LocaleProvider>
  );
}
