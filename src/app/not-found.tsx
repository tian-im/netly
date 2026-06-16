'use client';

import { buildDashboardUrl } from '@/lib/links';

const TRANSLATIONS = {
  en: { title: 'Page Not Found', desc: 'The page you are looking for does not exist or has been moved.', goBack: 'Go back to Dashboard' },
  zh: { title: '页面未找到', desc: '您访问的页面不存在或已被移动。', goBack: '返回仪表盘' },
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

export default function NotFound() {
  const locale = getInitialLocale();
  const t = TRANSLATIONS[locale];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
      <h2 className="text-6xl font-black text-primary animate-pulse">404</h2>
      <h3 className="text-2xl font-bold text-base-content">{t.title}</h3>
      <p className="text-base-content/60 max-w-md text-sm">
        {t.desc}
      </p>
      <a href={buildDashboardUrl()} className="btn btn-primary btn-sm">
        {t.goBack}
      </a>
    </div>
  );
}
