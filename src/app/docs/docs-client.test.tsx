import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import DocsClient from './docs-client';
import '@testing-library/jest-dom/vitest';

// Configure React act environment for tests
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

function renderDocsClient(htmlContent: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <DocsClient htmlContent={htmlContent} />
    </NextIntlClientProvider>
  );
}

describe('DocsClient Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the header and title translation', () => {
    renderDocsClient('<p>Test HTML</p>');
    expect(screen.getByText('User Manual')).toBeInTheDocument();
    expect(screen.getByText('Learn how to manage your accounts, import bank statements, configure rules, and compile statements.')).toBeInTheDocument();
  });

  it('renders the parsed HTML content inside the Card', () => {
    renderDocsClient('<div data-testid="custom-content">Embedded Markdown Content</div>');
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Embedded Markdown Content')).toBeInTheDocument();
  });
});
