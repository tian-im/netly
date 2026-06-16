'use client';

import { useEffect } from 'react';
import { buildDashboardUrl } from '@/lib/links';

const TRANSLATIONS = {
  en: { title: 'Application Error', desc: 'An unexpected error occurred in the system.', tryAgain: 'Try Again', dashboard: 'Dashboard' },
  zh: { title: '应用错误', desc: '系统发生了意外错误，请稍后重试。', tryAgain: '重试', dashboard: '仪表盘' },
} as const;

function getInitialLocale(): 'en' | 'zh' {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)netly_locale=(\w+)/);
    if (match && (match[1] === 'en' || match[1] === 'zh')) return match[1];
    const saved = localStorage.getItem('netly_locale');
    if (saved === 'en' || saved === 'zh') return saved;
  }
  return 'en';
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = getInitialLocale();
  const t = TRANSLATIONS[locale];

  useEffect(() => {
    console.error('Unhandled App Router Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
      <h2 className="text-6xl font-black text-error">500</h2>
      <h3 className="text-2xl font-bold text-base-content">{t.title}</h3>
      <p className="text-base-content/60 max-w-md text-sm">
        {t.desc}
      </p>
      <div className="flex gap-4">
        <button onClick={() => reset()} className="btn btn-primary btn-sm">
          {t.tryAgain}
        </button>
        <a href={buildDashboardUrl()} className="btn btn-outline btn-sm">
          {t.dashboard}
        </a>
      </div>
    </div>
  );
}
