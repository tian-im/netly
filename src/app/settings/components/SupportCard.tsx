'use client';

import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { buildKoFiUrl } from '@/lib/links';

export default function SupportCard() {
  const t = useTranslations('support');

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200 border-l-4 border-l-accent">
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2 text-accent">
          <Heart className="h-5 w-5 text-accent" />
          {t('cardTitle')}
        </h2>
        <p className="text-sm text-base-content/70">{t('cardDescription')}</p>
        <p className="text-sm text-base-content/85 font-medium mt-2">{t('cardMessage')}</p>
        <div className="card-actions justify-end mt-2">
          <a
            href={buildKoFiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm gap-1"
          >
            {t('ctaButton')}
          </a>
        </div>
      </div>
    </div>
  );
}
