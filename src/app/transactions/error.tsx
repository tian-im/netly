'use client';

import { useEffect } from 'react';
import { buildDashboardUrl } from '@/lib/links';
import { PREFERENCES, getPreference } from '@/lib/preferences';
import { Button } from '@/app/components/ui';

const TRANSLATIONS = {
  en: { title: 'Transactions Error', desc: 'Failed to load the transaction ledger. Please try again.', tryAgain: 'Try Again', goBack: 'Go to Dashboard' },
  zh: { title: '交易流水错误', desc: '加载交易流水账目失败，请重试。', tryAgain: '重试', goBack: '返回仪表盘' },
  'zh-TW': { title: '交易流水錯誤', desc: '載入交易流水帳目失敗，請重試。', tryAgain: '重試', goBack: '返回儀表板' },
  ja: { title: 'トランザクションエラー', desc: '取引台帳の読み込みに失敗しました。もう一度お試しください。', tryAgain: '再試行', goBack: 'ダッシュボードに戻る' },
  ko: { title: '거래 오류', desc: '거래 원장을 불러오지 못했습니다. 다시 시도해 주세요.', tryAgain: '다시 시도', goBack: '대시보드로 돌아가기' },
} as const;

// WHY: Using the unified getPreference instead of ad-hoc document.cookie regex.
// This follows the cookie-first hierarchy and keeps the cookie key in one place,
// matching the pattern used in error.tsx and not-found.tsx.
function getInitialLocale(): keyof typeof TRANSLATIONS {
  const val = getPreference(PREFERENCES.locale);
  if (val === 'zh-TW' || val === 'zh' || val === 'ja' || val === 'ko') return val;
  return 'en';
}

export default function TransactionsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = getInitialLocale();
  const t = TRANSLATIONS[locale];

  useEffect(() => {
    console.error('Transactions page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
      <h2 className="text-6xl font-black text-error">500</h2>
      <h3 className="text-2xl font-bold text-base-content">{t.title}</h3>
      <p className="text-base-content/60 max-w-md text-sm">
        {t.desc}
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} size="sm">
          {t.tryAgain}
        </Button>
        <Button href={buildDashboardUrl()} variant="outline" size="sm">
          {t.goBack}
        </Button>
      </div>
    </div>
  );
}
