'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Wallet, FolderTree, Tags, TrendingUp, Inbox, Settings, Heart, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  buildDashboardUrl,
  buildAccountsUrl,
  buildCategoriesUrl,
  buildTransactionsUrl,
  buildImportUrl,
  buildReportsUrl,
  buildSettingsUrl,
  buildDocsUrl,
  buildKoFiUrl,
} from '@/lib/links';

// WHY: navItems is a module-level const array. The builder functions are pure and
// return constant strings, so calling them at module scope is safe — no runtime
// values are needed until render time.
const navItems = [
  { href: buildDashboardUrl(),  labelKey: 'dashboard',    icon: BarChart3  },
  { href: buildAccountsUrl(),   labelKey: 'accounts',     icon: Wallet     },
  { href: buildCategoriesUrl(), labelKey: 'categories',   icon: Tags       },
  { href: buildTransactionsUrl(), labelKey: 'transactions', icon: FolderTree },
  { href: buildImportUrl(),     labelKey: 'import',       icon: Inbox      },
  { href: buildReportsUrl(),    labelKey: 'reports',      icon: TrendingUp },
  { href: buildSettingsUrl(),   labelKey: 'settings',     icon: Settings   },
  { href: buildDocsUrl(),       labelKey: 'docs',         icon: BookOpen   },
] as const;

function closeDrawer() {
  const checkbox = document.getElementById('nav-drawer') as HTMLInputElement | null;
  if (checkbox) checkbox.checked = false;
}

export default function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <div className="menu p-4 w-72 min-h-full bg-base-100 text-base-content flex flex-col justify-between shadow-2xl">
      <div>
        <div className="px-4 py-6 text-center lg:text-left">
          <h1 className="text-2xl font-black tracking-wider text-primary">
            {t('brand')}
          </h1>
          <p className="text-xs text-base-content/60 uppercase tracking-widest mt-1">
            {t('subtitle')}
          </p>
        </div>

        <ul className="space-y-1 mt-4">
          {navItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={closeDrawer}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-base-200'
                  }`}
                >
                  <Icon className="w-5 h-5 text-primary" />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-base-300/50 pt-3 space-y-2">
        {/* Support link — subtle, directly above the status bar */}
        <div className="px-4">
          <a
            href={buildKoFiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-base-content/50 hover:text-pink-400 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            {t('supportLink')}
          </a>
        </div>

        <div className="px-4 py-4 bg-base-200/50 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-success uppercase tracking-wider">
              {t('runningLocally')}
            </span>
          </div>
          <p className="text-[10px] text-base-content/50 mt-1">
            {t('dbPath')}
          </p>
        </div>
      </div>
    </div>
  );
}
