import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import AccountsClient from './accounts-client';
import enMessages from '../../../messages/en.json';
import { DEFAULT_CURRENCY } from '@/lib/currencies';

// Configure React act environment for tests
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock server actions
const mockCreateAccount = vi.fn();
const mockDeleteAccount = vi.fn();
const mockUpdateAccount = vi.fn();

vi.mock('../actions', () => ({
  createAccount: (...args: any[]) => mockCreateAccount(...args),
  deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
  updateAccount: (...args: any[]) => mockUpdateAccount(...args),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      refresh: vi.fn(),
    };
  },
}));

// Mock Lucide icons used by accounts-client
vi.mock('lucide-react', () => ({
  Wallet: () => <div data-testid="wallet-icon" />,
  ArrowUpDown: ({ className }: any) => <div data-testid="arrow-up-down" className={className} />,
  Plus: () => <div data-testid="plus-icon" />,
  Pencil: () => <div data-testid="pencil-icon" />,
  AlertTriangle: ({ className }: any) => <div data-testid="alert-triangle" className={className} />,
  Search: () => <div data-testid="search-icon" />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock currency selector to simplify the test (we verify CurrencySelector separately)
vi.mock('@/app/components/CurrencySelector', () => ({
  default: ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) => (
    <select
      data-testid={id || 'currency-selector'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="AUD">AUD</option>
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
    </select>
  ),
}));

// Mock translateError
vi.mock('@/lib/translateError', () => ({
  translateError: (err: any) => err?.message || 'Unknown error',
}));

describe('AccountsClient — create form currency sync with settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  function renderAccountsClient() {
    return render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AccountsClient
          initialAccounts={[]}
          initialTransactionSums={{}}
          initialLastTxDates={{}}
        />
      </NextIntlClientProvider>
    );
  }

  it('renders with DEFAULT_CURRENCY after mount when no localStorage preference', async () => {
    renderAccountsClient();
    // Wait for effects to fire (mounted=true + getPreferredCurrency)
    const select = await screen.findByTestId('new-account-currency') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_CURRENCY);
  });

  it('renders with localStorage preference after mount when set', async () => {
    localStorage.setItem('netly_pref_default_currency', 'EUR');
    renderAccountsClient();
    // Wait for effect to read localStorage
    const select = await screen.findByTestId('new-account-currency') as HTMLSelectElement;
    expect(select.value).toBe('EUR');
  });
});
