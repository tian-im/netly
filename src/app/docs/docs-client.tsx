'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/app/components/ui';

interface DocsClientProps {
  htmlContent: string;
}

export default function DocsClient({ htmlContent }: DocsClientProps) {
  const t = useTranslations('nav');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('docs')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('docsSubtitle')}
        </p>
      </div>

      <Card>
        <Card.Body className="p-6 md:p-8">
          <div
            className="user-manual-prose text-base-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </Card.Body>
      </Card>
    </div>
  );
}
