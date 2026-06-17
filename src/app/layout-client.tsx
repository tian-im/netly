'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export default function LayoutClient({ children, ssrLocale }: { children: React.ReactNode; ssrLocale?: string }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname === '/setup';

  if (isPublicPage) {
    return (
      <LocaleProvider ssrLocale={ssrLocale}>
        {children}
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider ssrLocale={ssrLocale}>
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

          <main className="flex-1 overflow-y-auto p-4 pb-8 lg:p-8 lg:pb-8">
            {children}
          </main>
        </div>

        <div className="drawer-side shrink-0 z-50">
          <label htmlFor="nav-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <Sidebar />
        </div>
      </div>
    </LocaleProvider>
  );
}
