import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../../messages/en.json';
import SupportCard from './SupportCard';
import { buildKoFiUrl } from '@/lib/links';

// Make React Testing Library aware
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

function renderSupportCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <SupportCard />
    </NextIntlClientProvider>
  );
}

describe('SupportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the card title', () => {
    renderSupportCard();
    expect(screen.getByText('Support Netly Ledger')).toBeDefined();
  });

  it('renders the card description', () => {
    renderSupportCard();
    expect(
      screen.getByText(
        /Netly Ledger is a free, open-source personal finance tool built by a solo developer/
      )
    ).toBeDefined();
  });

  it('renders the card message', () => {
    renderSupportCard();
    expect(
      screen.getByText(
        /If Netly Ledger helps you stay on top of your finances/
      )
    ).toBeDefined();
  });

  it('renders a link to the Ko-fi URL', () => {
    renderSupportCard();
    const link = screen.getByRole('link', { name: /Buy me a coffee on Ko-fi/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe(buildKoFiUrl());
  });

  it('link opens in a new tab with noopener noreferrer', () => {
    renderSupportCard();
    const link = screen.getByRole('link', { name: /Buy me a coffee on Ko-fi/i });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
