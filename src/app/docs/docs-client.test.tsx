import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import DocsClient from './docs-client';
import '@testing-library/jest-dom/vitest';

// Configure React act environment for tests
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

function renderDocsClient(htmlContent: string) {
  return render(
    <DocsClient htmlContent={htmlContent} />
  );
}

describe('DocsClient Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the parsed HTML content inside the Card', () => {
    // WHY: Only `id` attributes are allowed by the sanitizer (for heading anchors).
    // We use a heading with an id to verify content passes through sanitization.
    renderDocsClient('<h1 id="custom-content">Embedded Markdown Content</h1>');
    expect(screen.getByText('Embedded Markdown Content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
