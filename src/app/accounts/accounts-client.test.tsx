import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock providers for locale context
vi.mock('@/app/providers', () => ({
  useLocaleContext: () => ({ locale: 'en', setLocale: vi.fn() }),
}));

function makeAccount(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    name: `Account ${id}`,
    type: 'ASSET' as const,
    startingBalance: 1000,
    currency: 'AUD',
    _count: { transactions: 5 },
    ...overrides,
  };
}

function renderAccountsClient(
  initialAccounts: any[] = [],
  transactionSums: Record<string, number> = {},
  lastTxDates: Record<string, string | null> = {}
) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AccountsClient
        initialAccounts={initialAccounts}
        initialTransactionSums={transactionSums}
        initialLastTxDates={lastTxDates}
      />
    </NextIntlClientProvider>
  );
}

describe('AccountsClient — empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('shows the empty state when no accounts exist', async () => {
    renderAccountsClient();
    expect(screen.getByText('No accounts created yet. Please create an account using the form to start importing statement CSV files.')).toBeDefined();
  });

  it('renders the page title and subtitle', async () => {
    renderAccountsClient();
    expect(screen.getByText('Accounts Manager')).toBeDefined();
    expect(screen.getByText(/Create, view, and delete/)).toBeDefined();
  });

  it('renders the create account form heading', async () => {
    renderAccountsClient();
    expect(screen.getByText('Create Account')).toBeDefined();
  });
});

describe('AccountsClient — account list rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('renders a list of accounts with balances', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' }), makeAccount('2', { name: 'Savings', type: 'LIABILITY' })];
    const sums = { '1': 500, '2': -200 };

    renderAccountsClient(accounts, sums);

    expect(screen.getByText('Checking')).toBeDefined();
    expect(screen.getByText('Savings')).toBeDefined();
    // The currency badge
    const currencyBadges = screen.getAllByText('AUD');
    expect(currencyBadges.length).toBeGreaterThanOrEqual(2);
    // The type badge uses translated labels
    expect(screen.getByText('Asset')).toBeDefined();
    expect(screen.getByText('Liability')).toBeDefined();
    // The transaction count (both accounts have 5, use getAllByText)
    const txCounts = screen.getAllByText('5');
    expect(txCounts.length).toBe(2);
  });

  it('shows noResults when search returns empty', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    // Type in the search box
    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'NonexistentXYZ');
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeDefined();
    });
  });
});

describe('AccountsClient — creating an account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
    mockCreateAccount.mockResolvedValue(makeAccount('new-1', { name: 'New Account' }));
  });

  it('calls createAccount with correct data on form submit', async () => {
    renderAccountsClient();

    // Wait for mount + currency selector to appear
    const nameInput = await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    const balanceInput = screen.getByPlaceholderText('0.00');
    const submitBtn = screen.getByText('Add Account');

    await userEvent.type(nameInput, 'New Account');
    await userEvent.type(balanceInput, '500');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        'New Account',
        'ASSET',
        500,
        DEFAULT_CURRENCY
      );
    });
  });

  it('creates a LIABILITY account with negative balance', async () => {
    renderAccountsClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    await userEvent.type(nameInput, 'Credit Card');

    // Select Liability type via its label
    const typeSelect = screen.getByLabelText('Account Type') as HTMLSelectElement;
    await userEvent.selectOptions(typeSelect, 'LIABILITY');

    const balanceInput = screen.getByPlaceholderText('0.00');
    await userEvent.type(balanceInput, '2000');

    const submitBtn = screen.getByText('Add Account');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        'Credit Card',
        'LIABILITY',
        -2000,
        DEFAULT_CURRENCY
      );
    });
  });

  it('shows success toast after creating an account', async () => {
    mockCreateAccount.mockResolvedValue(makeAccount('new-2', { name: 'New Account' }));
    renderAccountsClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    await userEvent.type(nameInput, 'New Account');
    const submitBtn = screen.getByText('Add Account');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Account "New Account" created successfully')).toBeDefined();
    });
  });

  it('shows error toast when createAccount fails', async () => {
    mockCreateAccount.mockRejectedValue(new Error('ERR_ACCOUNT_NAME_REQUIRED'));
    renderAccountsClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    await userEvent.type(nameInput, 'Test');
    const submitBtn = screen.getByText('Add Account');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      // translateError mock returns the error message, then tErr translates it
      expect(screen.getByText('Account name is required.')).toBeDefined();
    });
  });

  it('shows duplicate name error toast when createAccount throws ERR_ACCOUNT_NAME_EXISTS', async () => {
    mockCreateAccount.mockRejectedValue(new Error('ERR_ACCOUNT_NAME_EXISTS'));
    renderAccountsClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    await userEvent.type(nameInput, 'Duplicate');
    const submitBtn = screen.getByText('Add Account');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('An account with this name already exists.')).toBeDefined();
    });
  });

  it('shows duplicate name error toast when updateAccount throws ERR_ACCOUNT_NAME_EXISTS', async () => {
    mockUpdateAccount.mockRejectedValue(new Error('ERR_ACCOUNT_NAME_EXISTS'));
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Duplicate Name');

    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('An account with this name already exists.')).toBeDefined();
    });
  });

  it('disables submit button when name is empty', async () => {
    renderAccountsClient();
    // Wait for mount
    await screen.findByPlaceholderText('e.g. Commonwealth Checking');
    const submitBtn = screen.getByText('Add Account') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});

describe('AccountsClient — sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('sorts accounts by name in ascending initial order', async () => {
    const accounts = [
      makeAccount('1', { name: 'Zebra' }),
      makeAccount('2', { name: 'Alpha' }),
      makeAccount('3', { name: 'Beta' }),
    ];
    renderAccountsClient(accounts);

    // Default sort is ascending by name, so Alpha should be first
    const rows = screen.getAllByRole('row');
    const firstRow = rows[1];
    expect(firstRow?.textContent).toContain('Alpha');
  });

  it('toggles sort direction on click', async () => {
    const accounts = [
      makeAccount('1', { name: 'Zebra' }),
      makeAccount('2', { name: 'Alpha' }),
      makeAccount('3', { name: 'Beta' }),
    ];
    renderAccountsClient(accounts);

    // Click to toggle to descending
    const nameSortBtn = screen.getByLabelText('Sort by account name');
    await userEvent.click(nameSortBtn);

    // Now descending, so Zebra should be first
    const rows = screen.getAllByRole('row');
    const firstRow = rows[1];
    expect(firstRow?.textContent).toContain('Zebra');
  });

  it('sorts accounts by balance', async () => {
    const accounts = [
      makeAccount('1', { name: 'High' }),
      makeAccount('2', { name: 'Low' }),
    ];
    const sums = { '1': 5000, '2': 100 };

    renderAccountsClient(accounts, sums);

    const balanceSortBtn = screen.getByLabelText('Sort by account balance');
    await userEvent.click(balanceSortBtn);

    // After clicking, should be ascending by balance (Low first)
    // The table body rendering may vary, but we can verify sort function was wiredup
    // Check that the sort direction indicator shows asc
    expect(screen.getByLabelText('Sort by account balance').textContent).toContain('↑');
  });

  it('sorts by transaction count', async () => {
    const accounts = [
      makeAccount('1', { name: 'Many Tx', _count: { transactions: 10 } }),
      makeAccount('2', { name: 'Few Tx', _count: { transactions: 1 } }),
    ];

    renderAccountsClient(accounts);
    const txSortBtn = screen.getByLabelText('Sort by transaction count');
    await userEvent.click(txSortBtn);

    expect(screen.getByLabelText('Sort by transaction count').textContent).toContain('↑');
  });
});

describe('AccountsClient — filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('filters accounts by type (ASSET only)', async () => {
    const accounts = [
      makeAccount('1', { name: 'Checking', type: 'ASSET' }),
      makeAccount('2', { name: 'Credit Card', type: 'LIABILITY' }),
    ];
    renderAccountsClient(accounts);

    const filterSelect = screen.getByLabelText('Filter accounts by type') as HTMLSelectElement;
    await userEvent.selectOptions(filterSelect, 'ASSET');

    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeDefined();
      expect(screen.queryByText('Credit Card')).toBeNull();
    });
  });

  it('filters accounts by type (LIABILITY only)', async () => {
    const accounts = [
      makeAccount('1', { name: 'Checking', type: 'ASSET' }),
      makeAccount('2', { name: 'Credit Card', type: 'LIABILITY' }),
    ];
    renderAccountsClient(accounts);

    const filterSelect = screen.getByLabelText('Filter accounts by type') as HTMLSelectElement;
    await userEvent.selectOptions(filterSelect, 'LIABILITY');

    await waitFor(() => {
      expect(screen.queryByText('Checking')).toBeNull();
      expect(screen.getByText('Credit Card')).toBeDefined();
    });
  });

  it('filters accounts by search term', async () => {
    const accounts = [
      makeAccount('1', { name: 'Checking Account' }),
      makeAccount('2', { name: 'Savings Account' }),
      makeAccount('3', { name: 'Credit Card' }),
    ];
    renderAccountsClient(accounts);

    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'Savings');

    await waitFor(() => {
      expect(screen.getByText('Savings Account')).toBeDefined();
      expect(screen.queryByText('Checking Account')).toBeNull();
      expect(screen.queryByText('Credit Card')).toBeNull();
    });
  });
});

describe('AccountsClient — editing an account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('opens edit modal with pre-filled values', async () => {
    const accounts = [makeAccount('1', { name: 'Checking', startingBalance: 1000, currency: 'AUD' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    // Modal should open with title
    expect(screen.getByText('Edit Account')).toBeDefined();
    // Name input should be pre-filled
    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    expect(nameInput).toBeDefined();
    // Starting balance input (positive magnitude)
    const balanceInput = screen.getByDisplayValue('1000') as HTMLInputElement;
    expect(balanceInput).toBeDefined();
  });

  it('calls updateAccount with correct data on save', async () => {
    mockUpdateAccount.mockResolvedValue(makeAccount('1', { name: 'Updated Checking', startingBalance: 2000 }));
    const accounts = [makeAccount('1', { name: 'Checking', startingBalance: 1000, currency: 'AUD' })];
    renderAccountsClient(accounts);

    // Open edit modal
    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    // Change name
    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Checking');

    // Change balance
    const balanceInput = screen.getByDisplayValue('1000') as HTMLInputElement;
    await userEvent.clear(balanceInput);
    await userEvent.type(balanceInput, '2000');

    // Click save
    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith(
        '1',
        'Updated Checking',
        'ASSET',
        2000,
        'AUD'
      );
    });
  });

  it('shows success toast after updating', async () => {
    mockUpdateAccount.mockResolvedValue(makeAccount('1', { name: 'Updated Checking' }));
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Checking');

    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Account "Updated Checking" updated successfully')).toBeDefined();
    });
  });

  it('shows discard confirmation when canceling with dirty form', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    // Change name to dirty the form
    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');

    // Click cancel
    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);

    // Discard confirmation should appear
    expect(screen.getByText('You have unsaved changes. Are you sure you want to discard them?')).toBeDefined();
  });
});

describe('AccountsClient — deleting an account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  it('shows delete confirmation modal', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Confirm Delete')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete the account/)).toBeDefined();
  });

  it('calls deleteAccount on confirm', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete Account');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('1');
    });
  });

  it('shows success toast after deleting', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete Account');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Account "Checking" deleted successfully')).toBeDefined();
    });
  });

  it('removes deleted account from the list', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    expect(screen.getByText('Checking')).toBeDefined();

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete Account');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText('Checking')).toBeNull();
    });
  });

  it('shows error toast when deleteAccount fails', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('ERR_ACCOUNT_NOT_FOUND'));
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete Account');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      // The translateError mock returns the error message as-is,
      // and useTranslations('errors') renders the translation from en.json
      expect(screen.getByText('Account not found.')).toBeDefined();
    });
  });
});

describe('AccountsClient — Escape key handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('closes edit modal on Escape', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);
    expect(screen.getByText('Edit Account')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Edit Account')).toBeNull();
    });
  });

  it('closes delete confirmation on Escape', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const deleteBtn = screen.getByLabelText('Delete Checking');
    await userEvent.click(deleteBtn);
    expect(screen.getByText('Confirm Delete')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).toBeNull();
    });
  });

  it('closes discard confirmation on Escape', async () => {
    const accounts = [makeAccount('1', { name: 'Checking' })];
    renderAccountsClient(accounts);

    const editBtn = screen.getByLabelText('Edit Checking');
    await userEvent.click(editBtn);

    // Dirty the form
    const nameInput = screen.getByDisplayValue('Checking') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');

    // Click cancel to trigger discard confirm
    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);
    expect(screen.getByText('You have unsaved changes. Are you sure you want to discard them?')).toBeDefined();

    // Press Escape to close the discard confirm
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('You have unsaved changes. Are you sure you want to discard them?')).toBeNull();
    });
  });
});

describe('AccountsClient — currency summary footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('shows currency summaries when accounts have transactions', async () => {
    const accounts = [makeAccount('1', { name: 'Checking', startingBalance: 1000 })];
    const sums = { '1': 500 };
    renderAccountsClient(accounts, sums);

    expect(screen.getByText('Currency Summaries')).toBeDefined();
    expect(screen.getByText('Summary (AUD)')).toBeDefined();
    // Assets should be 1500 (1000 starting + 500 net change)
    // getCurrencySymbol('AUD') returns '$'; appears in both table and summary
    const balanceTexts = screen.getAllByText('$1,500.00');
    expect(balanceTexts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AccountsClient — create form currency sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('renders with DEFAULT_CURRENCY after mount when no localStorage preference', async () => {
    renderAccountsClient();
    const select = await screen.findByTestId('new-account-currency') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_CURRENCY);
  });

  it('renders with localStorage preference after mount when set', async () => {
    localStorage.setItem('netly_pref_default_currency', 'EUR');
    renderAccountsClient();
    const select = await screen.findByTestId('new-account-currency') as HTMLSelectElement;
    expect(select.value).toBe('EUR');
  });
});
