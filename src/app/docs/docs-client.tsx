'use client';

import React from 'react';
import { Card } from '@/app/components/ui';

interface DocsClientProps {
  htmlContent: string;
}

export default function DocsClient({ htmlContent }: DocsClientProps) {
  return (
    <div className="max-w-4xl mx-auto">
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
