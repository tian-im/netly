'use client';

import Link from 'next/link';
import { BarChart3, Wallet, FolderTree, Tags, TrendingUp, Inbox, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Sidebar() {
  const t = useTranslations('nav');

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
          <li>
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <BarChart3 className="w-5 h-5 text-primary" /> {t('dashboard')}
            </Link>
          </li>
          <li>
            <Link href="/accounts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <Wallet className="w-5 h-5 text-primary" /> {t('accounts')}
            </Link>
          </li>
          <li>
            <Link href="/transactions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <FolderTree className="w-5 h-5 text-primary" /> {t('transactions')}
            </Link>
          </li>
          <li>
            <Link href="/categories" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <Tags className="w-5 h-5 text-primary" /> {t('categories')}
            </Link>
          </li>
          <li>
            <Link href="/reports" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <TrendingUp className="w-5 h-5 text-primary" /> {t('reports')}
            </Link>
          </li>
          <li>
            <Link href="/import" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <Inbox className="w-5 h-5 text-primary" /> {t('import')}
            </Link>
          </li>
          <li>
            <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-colors font-medium">
              <Settings className="w-5 h-5 text-primary" /> {t('settings')}
            </Link>
          </li>
        </ul>
      </div>

      <div className="space-y-4">
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
