'use client';

import { useTranslations } from 'next-intl';
import { Heart, Github } from 'lucide-react';
import { buildKoFiUrl, buildGitHubIssuesUrl } from '@/lib/links';

import { Card, Button } from '@/app/components/ui';

export default function SupportCard() {
  const t = useTranslations('support');

  return (
    <Card className="border-l-4 border-l-accent">
      <Card.Body>
        <Card.Title icon={<Heart className="h-5 w-5 text-accent" />} color="accent">
          {t('cardTitle')}
        </Card.Title>
        <p className="text-sm text-base-content/70">{t('cardDescription')}</p>
        <p className="text-sm text-base-content/85 font-medium mt-2">{t('cardMessage')}</p>
        <Card.Actions className="mt-2">
          <Button
            href={buildKoFiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            variant="accent"
            size="sm"
            className="gap-1 text-white"
          >
            {t('ctaButton')}
          </Button>
          <Button
            href={buildGitHubIssuesUrl()}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
            icon={<Github className="h-4 w-4" />}
            className="gap-1"
          >
            {t('lodgeIssueButton')}
          </Button>
        </Card.Actions>
      </Card.Body>
    </Card>
  );
}
