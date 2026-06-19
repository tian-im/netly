'use client';

import { useEffect } from 'react';
import { buildDashboardUrl } from '@/lib/links';
import { Button } from '@/app/components/ui';

const TRANSLATIONS = {
  en: { title: 'Transactions Error', desc: 'Failed to load the transaction ledger. Please try again.', tryAgain: 'Try Again', goBack: 'Go to Dashboard' },
  zh: { title: '交易流水错误', desc: '加载交易流水账目失败，请重试。', tryAgain: '重试', goBack: '返回仪表盘' },
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
