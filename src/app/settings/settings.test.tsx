import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import SettingsClient from './settings-client';
import { buildAccountsUrl, buildTransactionsUrl, buildCategoriesUrl } from '@/lib/links';

// Make React Testing Library aware
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock server actions
const mockVacuumDatabase = vi.fn();
const mockExportAllTransactions = vi.fn();
const mockExportAllAccounts = vi.fn();

vi.mock('@/app/actions', () => ({
  vacuumDatabase: () => mockVacuumDatabase(),
  exportAllTransactions: () => mockExportAllTransactions(),
  exportAllAccounts: () => mockExportAllAccounts(),
}));

// Mock next/navigation
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return { refresh: mockRefresh, push: mockPush };
  },
  usePathname() {
    return '/settings';
  },
}));

// Mock providers for locale context
const mockSetLocale = vi.fn();
vi.mock('@/app/providers', () => ({
  useLocaleContext: () => ({ locale: 'en', setLocale: mockSetLocale }),
}));

// Mock simplewebauthn browser
const mockStartRegistration = vi.fn();
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: (...args: any[]) => mockStartRegistration(...args),
}));

// Mock csv-export
const mockDownloadCSV = vi.fn();
const mockGenerateLedgerCSV = vi.fn(() => 'mock-ledger-csv');
const mockGenerateAccountCSV = vi.fn(() => 'mock-account-csv');
vi.mock('@/lib/csv-export', () => ({
  generateLedgerCSV: mockGenerateLedgerCSV,
  generateAccountCSV: mockGenerateAccountCSV,
  downloadCSV: mockDownloadCSV,
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const defaultDbInfo = {
  fileSize: 10240,
  lastModified: new Date('2026-06-17T00:00:00Z').toISOString(),
  schemaVersion: '20260601_init',
  lastImportTimestamp: new Date('2026-06-16T12:00:00Z').toISOString(),
};

function renderSettingsClient(overrides: Partial<React.ComponentProps<typeof SettingsClient>> = {}) {
  const props = {
    accountsCount: 3,
    transactionsCount: 50,
    rulesCount: 5,
    dbInfo: defaultDbInfo,
    passKeys: [
      {
        id: 'pk-1',
        deviceName: 'MacBook TouchID',
        createdAt: '2026-06-10T10:00:00Z',
        lastUsedAt: '2026-06-16T08:00:00Z',
      },
    ],
    initialMcpTokens: [
      {
        id: 'mcp-1',
        name: 'IDE Client',
        createdAt: '2026-06-15T00:00:00Z',
        lastUsedAt: '2026-06-16T10:00:00Z',
      },
    ],
    earliestTxDate: '2026-06-01T00:00:00Z',
    latestTxDate: '2026-06-15T00:00:00Z',
    ...overrides,
  };

  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <SettingsClient {...props} />
    </NextIntlClientProvider>
  );
}

describe('SettingsClient — structure and rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the page header and all major sections', async () => {
    renderSettingsClient();
    expect(screen.getByText('System Settings')).toBeDefined();
    expect(screen.getByText('PassKeys')).toBeDefined();
    expect(screen.getByText('Model Context Protocol (MCP) Access')).toBeDefined();
    expect(screen.getByText('Local Database Metrics')).toBeDefined();
    expect(screen.getByText('App Preferences')).toBeDefined();
    expect(screen.getByText('Database Information')).toBeDefined();
    expect(screen.getByText('Data Export & Backup')).toBeDefined();
    expect(screen.getByText('Support Netly Ledger')).toBeDefined();
    expect(screen.getByText('Danger Zone')).toBeDefined();
  });
});

describe('SettingsClient — empty state onboarding banners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows account onboarding banner if accounts count is 0', () => {
    renderSettingsClient({ accountsCount: 0 });
    expect(screen.getByText(/Welcome to Netly Ledger!/)).toBeDefined();
    expect(screen.getByText(/creating your first account/i)).toBeDefined();
    expect(screen.getByText('Go to Accounts')).toBeDefined();
    // Verify no emoji is used and Lucide icon is rendered instead
    expect(screen.queryByText(/✨/)).toBeNull();
    expect(document.querySelector('svg.lucide-sparkles')).not.toBeNull();
  });

  it('shows CSV import onboarding banner if accounts exist but transactions count is 0', () => {
    renderSettingsClient({ accountsCount: 2, transactionsCount: 0 });
    expect(screen.getByText(/Welcome to Netly Ledger!/)).toBeDefined();
    expect(screen.getByText(/importing a bank statement CSV/i)).toBeDefined();
    expect(screen.getByText('Go to Import')).toBeDefined();
    // Verify no emoji is used and Lucide icon is rendered instead
    expect(screen.queryByText(/✨/)).toBeNull();
    expect(document.querySelector('svg.lucide-sparkles')).not.toBeNull();
  });

  it('does not show onboarding banners if both accounts and transactions exist', () => {
    renderSettingsClient({ accountsCount: 2, transactionsCount: 10 });
    expect(screen.queryByText(/Welcome to Netly Ledger!/)).toBeNull();
  });
});

describe('DatabaseMetricsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders counts and hoverable/clickable navigation links', () => {
    renderSettingsClient({ accountsCount: 7, transactionsCount: 123, rulesCount: 9 });
    
    // Check counts
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('123')).toBeDefined();
    expect(screen.getByText('9')).toBeDefined();

    // Check stats links exist
    const accountsLink = screen.getByText('Managed Accounts').closest('a');
    expect(accountsLink?.getAttribute('href')).toBe(buildAccountsUrl());

    const transactionsLink = screen.getByText('Total Transactions').closest('a');
    expect(transactionsLink?.getAttribute('href')).toBe(buildTransactionsUrl());

    const rulesLink = screen.getByText('Matching Rules').closest('a');
    expect(rulesLink?.getAttribute('href')).toBe(`${buildCategoriesUrl()}?tab=rules`);
  });

  it('renders derived transaction date ranges correctly', () => {
    renderSettingsClient({
      earliestTxDate: '2026-06-01T00:00:00Z',
      latestTxDate: '2026-06-15T00:00:00.000Z',
    });
    // Format is "Data range: Jun 1, 2026 to Jun 15, 2026"
    expect(screen.getByText(/Data range: Jun 1, 2026 to Jun 15, 2026/)).toBeDefined();
  });

  it('renders noDataRange text if dates are null', () => {
    renderSettingsClient({ earliestTxDate: null, latestTxDate: null });
    expect(screen.getByText('No transactions imported yet')).toBeDefined();
  });
});

describe('PreferencesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    localStorage.clear();
  });

  it('updates preference on date format change', async () => {
    renderSettingsClient();
    const formatSelect = screen.getByLabelText('Preferred Date Format') as HTMLSelectElement;
    
    await waitFor(() => expect(formatSelect.disabled).toBe(false));
    await userEvent.selectOptions(formatSelect, 'DD/MM/YYYY');
    expect(localStorage.getItem('netly_pref_date_format')).toBe('DD/MM/YYYY');
    expect(screen.getByText(/Date format preference updated to DD\/MM\/YYYY/)).toBeDefined();
  });

  it('updates preference on interface language change', async () => {
    renderSettingsClient();
    const langSelect = screen.getByLabelText('Language Toggler') as HTMLSelectElement;
    
    await waitFor(() => expect(langSelect.disabled).toBe(false));
    await userEvent.selectOptions(langSelect, 'zh');
    expect(mockSetLocale).toHaveBeenCalledWith('zh');
  });

  it('renders rule mode dropdown and updates preference on change', async () => {
    renderSettingsClient();
    const ruleModeSelect = screen.getByLabelText('Auto-Categorization Mode') as HTMLSelectElement;

    await waitFor(() => expect(ruleModeSelect.disabled).toBe(false));
    expect(ruleModeSelect.value).toBe('ask');

    await userEvent.selectOptions(ruleModeSelect, 'always');
    expect(localStorage.getItem('netly_rule_mode')).toBe('always');
    expect(screen.getByText(/Auto-categorization mode set to/)).toBeDefined();
  });
});

describe('DatabaseInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders basic database statistics', () => {
    renderSettingsClient();
    expect(screen.getByText('10.0 KB')).toBeDefined();
    expect(screen.getByText('Jun 17, 2026, 12:00:00 AM')).toBeDefined();
    expect(screen.getByText('Jun 16, 2026, 12:00:00 PM')).toBeDefined();
  });

  it('triggers database vacuum and updates state', async () => {
    mockVacuumDatabase.mockResolvedValue(undefined);
    renderSettingsClient();

    const vacuumBtn = screen.getByRole('button', { name: /Vacuum & Optimize Database/i });
    await userEvent.click(vacuumBtn);

    await waitFor(() => {
      expect(mockVacuumDatabase).toHaveBeenCalled();
      expect(screen.getByText('Database optimized and vacuumed successfully.')).toBeDefined();
    });
  });

  it('handles database vacuum error gracefully', async () => {
    mockVacuumDatabase.mockRejectedValue(new Error('Vacuum error'));
    renderSettingsClient();

    const vacuumBtn = screen.getByRole('button', { name: /Vacuum & Optimize Database/i });
    await userEvent.click(vacuumBtn);

    await waitFor(() => {
      expect(screen.getByText('Vacuum error')).toBeDefined();
    });
  });
});

describe('ExportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('triggers transactions export CSV download', async () => {
    mockExportAllTransactions.mockResolvedValue([{ id: 'tx-1', date: new Date(), payee: 'Target', amount: -20 }]);
    renderSettingsClient({ transactionsCount: 5 });

    const txBtn = screen.getByRole('button', { name: /Export Transactions/i });
    await userEvent.click(txBtn);

    await waitFor(() => {
      expect(mockExportAllTransactions).toHaveBeenCalled();
      expect(mockGenerateLedgerCSV).toHaveBeenCalled();
      expect(mockDownloadCSV).toHaveBeenCalled();
      expect(screen.getByText('Export successful')).toBeDefined();
    });
  });

  it('triggers accounts export CSV download', async () => {
    mockExportAllAccounts.mockResolvedValue([{ id: 'acc-1', name: 'Savings', type: 'ASSET' }]);
    renderSettingsClient({ accountsCount: 2 });

    const accBtn = screen.getByRole('button', { name: /Export Accounts/i });
    await userEvent.click(accBtn);

    await waitFor(() => {
      expect(mockExportAllAccounts).toHaveBeenCalled();
      expect(mockGenerateAccountCSV).toHaveBeenCalled();
      expect(mockDownloadCSV).toHaveBeenCalled();
      expect(screen.getByText('Export successful')).toBeDefined();
    });
  });
});

describe('DangerZoneCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('closes wipe confirmation modal on Escape key', async () => {
    renderSettingsClient();
    
    // Open modal
    const wipeBtn = screen.getByRole('button', { name: 'Wipe Database' });
    await userEvent.click(wipeBtn);
    expect(screen.getByText('Nuclear Option: Confirm Database Wipe')).toBeDefined();

    // Check modal close on Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Nuclear Option: Confirm Database Wipe')).toBeNull();
    });
  });
});

describe('PassKeySection API & interactive behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/auth/register/begin') {
        return {
          ok: true,
          json: async () => ({ state: 'reg-state', challenge: '123' }),
        } as Response;
      }
      if (url === '/api/auth/register/complete') {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }
      if (url === '/api/auth/credentials') {
        return {
          ok: true,
          json: async () => [
            { id: 'pk-1', deviceName: 'MacBook TouchID', createdAt: '2026-06-10T10:00:00Z' },
            { id: 'pk-2', deviceName: 'Yubikey', createdAt: '2026-06-17T00:00:00Z' },
          ],
        } as Response;
      }
      return { ok: false } as Response;
    });
  });

  it('opens register modal, calls simplewebauthn startRegistration, and updates key list', async () => {
    mockStartRegistration.mockResolvedValue({ id: 'cred-1' });
    renderSettingsClient();

    const addBtn = screen.getByRole('button', { name: 'Add PassKey' });
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('e.g. My iPhone Face ID');
    await userEvent.type(nameInput, 'Yubikey');

    const submitBtn = screen.getByRole('button', { name: 'Register' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register/begin', expect.anything());
      expect(mockStartRegistration).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register/complete', expect.anything());
      expect(screen.getByText('PassKey added successfully')).toBeDefined();
    });
  });

  it('prompts deletion warning and revokes passkey on confirmation', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/auth/credentials') {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: false } as Response;
    });

    renderSettingsClient({
      passKeys: [
        { id: 'pk-1', deviceName: 'MacBook TouchID', createdAt: '2026-06-10T10:00:00Z', lastUsedAt: null },
        { id: 'pk-2', deviceName: 'Yubikey', createdAt: '2026-06-11T00:00:00Z', lastUsedAt: null },
      ],
    });

    // Revoke pk-2
    const deleteBtn = screen.getByLabelText('Remove PassKey - Yubikey');
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Confirm PassKey Removal')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to remove the PassKey "Yubikey"?/)).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Remove Key' });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/auth/credentials', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(screen.getByText('PassKey removed')).toBeDefined();
    });
  });

  it('closes delete modal on Escape key', async () => {
    renderSettingsClient({
      passKeys: [
        { id: 'pk-1', deviceName: 'MacBook TouchID', createdAt: '2026-06-10T10:00:00Z', lastUsedAt: null },
        { id: 'pk-2', deviceName: 'Yubikey', createdAt: '2026-06-11T00:00:00Z', lastUsedAt: null },
      ],
    });

    const deleteBtn = screen.getByLabelText('Remove PassKey - Yubikey');
    await userEvent.click(deleteBtn);
    expect(screen.getByText('Confirm PassKey Removal')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Confirm PassKey Removal')).toBeNull();
    });
  });
});

describe('McpSection API & interactive behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('generates a new token and copies to clipboard', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/mcp/tokens') {
        return {
          ok: true,
          json: async () => ({ token: 'mock-sse-token-123', name: 'OpenCode Client' }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    renderSettingsClient();
    const addBtn = screen.getByRole('button', { name: 'Generate Token' });
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('e.g. OpenCode Client');
    await userEvent.type(nameInput, 'OpenCode Client');

    const submitBtn = screen.getByRole('dialog').querySelector('button.btn-primary') as HTMLElement;
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/mcp/tokens', expect.objectContaining({
        method: 'POST',
      }));
      expect(screen.getByText('MCP token generated successfully')).toBeDefined();
      expect(screen.getByText('MCP Token Generated')).toBeDefined();
    });

    const copyBtn = screen.getByLabelText('Copy');
    await userEvent.click(copyBtn);
    expect(mockWriteText).toHaveBeenCalledWith('mock-sse-token-123');
    expect(screen.getByText('Copied to clipboard')).toBeDefined();
  });

  it('prompts revocation warning modal and revokes access token', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/mcp/tokens') {
        return { ok: true } as Response;
      }
      return { ok: false } as Response;
    });

    renderSettingsClient();
    const revokeBtn = screen.getByLabelText('Revoke - IDE Client');
    await userEvent.click(revokeBtn);

    expect(screen.getByText('Confirm Token Revocation')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to revoke the MCP access token "IDE Client"?/)).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: 'Revoke Token' });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/mcp/tokens', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(screen.getByText('MCP token revoked successfully')).toBeDefined();
    });
  });

  it('closes revocation modal on Escape key', async () => {
    renderSettingsClient();
    const revokeBtn = screen.getByLabelText('Revoke - IDE Client');
    await userEvent.click(revokeBtn);
    expect(screen.getByText('Confirm Token Revocation')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Confirm Token Revocation')).toBeNull();
    });
  });
});
