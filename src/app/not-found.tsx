'use client';

import { buildDashboardUrl } from '@/lib/links';
import { PREFERENCES, getPreference } from '@/lib/preferences';

import { Button } from '@/app/components/ui';

const TRANSLATIONS = {
  en: { title: 'Page Not Found', desc: 'The page you are looking for does not exist or has been moved.', goBack: 'Go back to Dashboard' },
  zh: { title: '页面未找到', desc: '您访问的页面不存在或已被移动。', goBack: '返回仪表盘' },
  'zh-TW': { title: '頁面未找到', desc: '您訪問的頁面不存在或已被移動。', goBack: '返回儀表板' },
  ja: { title: 'ページが見つかりません', desc: 'お探しのページは存在しないか、移動された可能性があります。', goBack: 'ダッシュボードに戻る' },
  ko: { title: '페이지를 찾을 수 없음', desc: '찾으시는 페이지가 존재하지 않거나 이동되었습니다.', goBack: '대시보드로 돌아가기' },
} as const;

// WHY: Using the unified getPreference instead of ad-hoc document.cookie regex.
// This follows the cookie-first hierarchy and keeps the cookie key in one place.
function getInitialLocale(): keyof typeof TRANSLATIONS {
  const val = getPreference(PREFERENCES.locale);
  if (val === 'zh-TW' || val === 'zh' || val === 'ja' || val === 'ko') return val;
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
      <Button href={buildDashboardUrl()} size="sm">
        {t.goBack}
      </Button>
    </div>
  );
}
