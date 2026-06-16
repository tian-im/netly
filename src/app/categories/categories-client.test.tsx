import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import CategoriesClient from './categories-client';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock server actions
const mockCreateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockCreateCategoryRule = vi.fn();
const mockDeleteCategoryRule = vi.fn();

vi.mock('../actions', () => ({
  createCategory: (...args: any[]) => mockCreateCategory(...args),
  deleteCategory: (...args: any[]) => mockDeleteCategory(...args),
  updateCategory: (...args: any[]) => mockUpdateCategory(...args),
  createCategoryRule: (...args: any[]) => mockCreateCategoryRule(...args),
  deleteCategoryRule: (...args: any[]) => mockDeleteCategoryRule(...args),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return { push: vi.fn(), refresh: vi.fn() };
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Tags: ({ className }: any) => <div data-testid="tags-icon" className={className} />,
  Settings: ({ className }: any) => <div data-testid="settings-icon" className={className} />,
  Plus: ({ className }: any) => <div data-testid="plus-icon" className={className} />,
  Pencil: ({ className }: any) => <div data-testid="pencil-icon" className={className} />,
  AlertTriangle: ({ className }: any) => <div data-testid="alert-icon" className={className} />,
  ArrowUpDown: ({ className }: any) => <div data-testid="arrow-up-down" className={className} />,
  ArrowUp: ({ className }: any) => <div data-testid="arrow-up" className={className} />,
  ArrowDown: ({ className }: any) => <div data-testid="arrow-down" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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

function makeCategory(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    name: `Category ${id}`,
    type: 'EXPENSE',
    cashFlowType: 'OPERATING',
    transactionsCount: 0,
    rulesCount: 0,
    rules: [],
    ...overrides,
  };
}

function renderCategoriesClient(initialCategories: any[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CategoriesClient initialCategories={initialCategories} />
    </NextIntlClientProvider>
  );
}

describe('CategoriesClient — page structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the page title and subtitle', async () => {
    renderCategoriesClient();
    expect(screen.getByText('Categories Manager')).toBeDefined();
    expect(screen.getByText(/Create and manage financial categories/)).toBeDefined();
  });

  it('renders both tabs', async () => {
    renderCategoriesClient();
    expect(screen.getByText('Categories')).toBeDefined();
    expect(screen.getByText('Match Rules')).toBeDefined();
  });

  it('shows categories tab by default', async () => {
    renderCategoriesClient();
    expect(screen.getByText('Stored Categories')).toBeDefined();
  });
});

describe('CategoriesClient — empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows empty state when no categories exist', async () => {
    renderCategoriesClient();
    expect(screen.getByText('No categories found')).toBeDefined();
    expect(screen.getByText(/Get started by adding a category/)).toBeDefined();
  });

  it('shows the create category form on the right', async () => {
    renderCategoriesClient();
    // The heading and button share the same text; use a more specific query
    const headings = screen.getAllByText('Create Category');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('e.g. Dining Out, Freelance')).toBeDefined();
  });
});

describe('CategoriesClient — categories list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders category rows when data exists', async () => {
    const cats = [
      makeCategory('1', { name: 'Food' }),
      makeCategory('2', { name: 'Transport' }),
    ];
    renderCategoriesClient(cats);

    expect(screen.getByText('Food')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('shows localized badge labels for type and cash flow', async () => {
    const cats = [
      makeCategory('1', { name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' }),
      makeCategory('2', { name: 'Rent', type: 'EXPENSE', cashFlowType: 'OPERATING' }),
      makeCategory('3', { name: 'Transfer', type: 'TRANSFER', cashFlowType: 'FINANCING' }),
    ];
    renderCategoriesClient(cats);

    // Badges show localized text — use exact match to avoid select options
    expect(screen.getByText('Income', { exact: true })).toBeDefined();
    expect(screen.getByText('Expense', { exact: true })).toBeDefined();
    // "Transfer" appears as both category name and badge text
    const transferEls = screen.getAllByText('Transfer', { exact: true });
    expect(transferEls.length).toBe(2);
  });

  it('shows localized cash flow type badges', async () => {
    const cats = [
      makeCategory('1', { name: 'Groceries', cashFlowType: 'OPERATING' }),
      makeCategory('2', { name: 'Stocks', cashFlowType: 'INVESTING' }),
      makeCategory('3', { name: 'Loan', cashFlowType: 'FINANCING' }),
    ];
    renderCategoriesClient(cats);

    // Use exact match to avoid matching option text like "OPERATING (Daily business / living)"
    expect(screen.getByText('Operating', { exact: true })).toBeDefined();
    expect(screen.getByText('Investing', { exact: true })).toBeDefined();
    expect(screen.getByText('Financing', { exact: true })).toBeDefined();
  });

  it('shows rules count and transaction count', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        transactionsCount: 10,
        rulesCount: 2,
        rules: [{ id: 'r1', pattern: 'Restaurant' }, { id: 'r2', pattern: 'Cafe' }],
      }),
    ];
    renderCategoriesClient(cats);

    expect(screen.getByText('2 match rule(s)')).toBeDefined();
    expect(screen.getByText('10 tx')).toBeDefined();
  });

  it('shows noResults when search returns empty', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const searchInput = screen.getByPlaceholderText('Search categories...');
    await userEvent.type(searchInput, 'NonexistentXYZ');

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeDefined();
    });
  });

  it('filters categories by search query', async () => {
    const cats = [
      makeCategory('1', { name: 'Food' }),
      makeCategory('2', { name: 'Transport' }),
    ];
    renderCategoriesClient(cats);

    const searchInput = screen.getByPlaceholderText('Search categories...');
    await userEvent.type(searchInput, 'Food');

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeDefined();
      expect(screen.queryByText('Transport')).toBeNull();
    });
  });

  it('clears search when clicking X button', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const searchInput = screen.getByPlaceholderText('Search categories...') as HTMLInputElement;
    await userEvent.type(searchInput, 'Food');

    const clearBtn = await screen.findByLabelText('Clear search query');
    await userEvent.click(clearBtn);
    expect(searchInput.value).toBe('');
  });
});

describe('CategoriesClient — creating a category', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockCreateCategory.mockResolvedValue(makeCategory('new-1', { name: 'New Category' }));
  });

  it('calls createCategory with correct data on form submit', async () => {
    renderCategoriesClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    const submitBtn = screen.getByRole('button', { name: 'Create Category' });

    await userEvent.type(nameInput, 'New Category');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith('New Category', 'EXPENSE', 'OPERATING');
    });
  });

  it('shows success toast after creating a category', async () => {
    renderCategoriesClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    await userEvent.type(nameInput, 'New Category');
    const submitBtn = screen.getByRole('button', { name: 'Create Category' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Category "New Category" created successfully')).toBeDefined();
    });
  });

  it('shows error toast when createCategory fails', async () => {
    mockCreateCategory.mockRejectedValue(new Error('ERR_CATEGORY_NAME_EXISTS'));
    renderCategoriesClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    await userEvent.type(nameInput, 'Duplicate');
    const submitBtn = screen.getByRole('button', { name: 'Create Category' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('A category with this name already exists.')).toBeDefined();
    });
  });

  it('disables submit button when name is empty', async () => {
    renderCategoriesClient();
    await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    const submitBtn = screen.getByRole('button', { name: 'Create Category' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('allows creating with INCOME type', async () => {
    renderCategoriesClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    await userEvent.type(nameInput, 'Freelance');

    const typeSelect = screen.getByLabelText('Category Type') as HTMLSelectElement;
    await userEvent.selectOptions(typeSelect, 'INCOME');

    const cfSelect = screen.getByLabelText('Cash Flow Section') as HTMLSelectElement;
    await userEvent.selectOptions(cfSelect, 'OPERATING');

    const submitBtn = screen.getByRole('button', { name: 'Create Category' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith('Freelance', 'INCOME', 'OPERATING');
    });
  });
});

describe('CategoriesClient — editing a category', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockUpdateCategory.mockResolvedValue(makeCategory('1', { name: 'Updated Food' }));
  });

  it('opens edit modal with pre-filled values', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    expect(screen.getByText('Edit Category')).toBeDefined();
    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    expect(nameInput).toBeDefined();
  });

  it('calls updateCategory on save', async () => {
    mockUpdateCategory.mockResolvedValue(makeCategory('1', { name: 'Updated Food' }));
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Food');

    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith('1', 'Updated Food', 'EXPENSE', 'OPERATING');
    });
  });

  it('shows success toast after updating', async () => {
    mockUpdateCategory.mockResolvedValue(makeCategory('1', { name: 'Updated Food' }));
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Food');

    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Category "Updated Food" updated successfully')).toBeDefined();
    });
  });

  it('shows error toast when updateCategory fails', async () => {
    mockUpdateCategory.mockRejectedValue(new Error('ERR_CATEGORY_NAME_EXISTS'));
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Duplicate');

    const saveBtn = screen.getByText('Save Changes');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('A category with this name already exists.')).toBeDefined();
    });
  });

  it('shows discard confirmation when canceling with dirty form', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');

    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);

    // Discard modal should appear (DaisyUI styled, not window.confirm)
    await waitFor(() => {
      expect(screen.getByText('Discard Changes')).toBeDefined();
      expect(screen.getByText('You have unsaved changes. Are you sure you want to discard them?')).toBeDefined();
    });
  });

  it('closes edit modal when discarding changes', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);
    expect(screen.getByText('Edit Category')).toBeDefined();

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');

    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);

    // Click "Discard" in the discard modal
    const discardBtn = screen.getByText('Discard');
    await userEvent.click(discardBtn);

    await waitFor(() => {
      expect(screen.queryByText('Edit Category')).toBeNull();
    });
  });
});

describe('CategoriesClient — deleting a category', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockDeleteCategory.mockResolvedValue(undefined);
  });

  it('shows delete confirmation modal', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Confirm Delete')).toBeDefined();
  });

  it('calls deleteCategory on confirm', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete Category');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith('1');
    });
  });

  it('shows success toast after deleting', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.getByText('Delete Category');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Category "Food" deleted successfully')).toBeDefined();
    });
  });

  it('removes deleted category from the list', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);
    expect(screen.getByText('Food')).toBeDefined();

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.getByText('Delete Category');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText('Food')).toBeNull();
    });
  });

  it('shows error toast when deleteCategory fails', async () => {
    mockDeleteCategory.mockRejectedValue(new Error('ERR_CATEGORY_NOT_FOUND'));
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.getByText('Delete Category');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Category not found.')).toBeDefined();
    });
  });

  it('shows transfer protected toast when trying to delete Transfer category', async () => {
    const cats = [makeCategory('1', { name: 'Transfer', type: 'TRANSFER' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Transfer');
    await userEvent.click(deleteBtn);

    // Should show toast instead of opening modal
    await waitFor(() => {
      expect(screen.getByText('The "Transfer" category is critical and cannot be deleted.')).toBeDefined();
    });

    // Delete modal should not appear
    expect(screen.queryByText('Confirm Delete')).toBeNull();
  });
});

describe('CategoriesClient — sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('sorts categories by name ascending by default', async () => {
    const cats = [
      makeCategory('1', { name: 'Zebra' }),
      makeCategory('2', { name: 'Alpha' }),
      makeCategory('3', { name: 'Beta' }),
    ];
    renderCategoriesClient(cats);

    // Default sort is ascending by name, so Alpha should be first
    const rows = screen.getAllByRole('row');
    const firstRow = rows[1];
    expect(firstRow?.textContent).toContain('Alpha');
  });

  it('toggles sort direction on click', async () => {
    const cats = [
      makeCategory('1', { name: 'Zebra' }),
      makeCategory('2', { name: 'Alpha' }),
    ];
    renderCategoriesClient(cats);

    const nameSortBtn = screen.getByLabelText('Sort by category name');
    await userEvent.click(nameSortBtn);

    // Now descending, so Zebra should be first
    const rows = screen.getAllByRole('row');
    const firstRow = rows[1];
    expect(firstRow?.textContent).toContain('Zebra');
  });

  it('sorts by type', async () => {
    const cats = [
      makeCategory('1', { name: 'Income', type: 'INCOME' }),
      makeCategory('2', { name: 'Expense', type: 'EXPENSE' }),
      makeCategory('3', { name: 'Transfer', type: 'TRANSFER' }),
    ];
    renderCategoriesClient(cats);

    const typeSortBtn = screen.getByLabelText('Sort by category type');
    await userEvent.click(typeSortBtn);

    // After sort ascending by type: EXPENSE, INCOME, TRANSFER
    // Check the first data row (2nd row overall, after header)
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(firstDataRow?.textContent).toContain('Expense');
  });

  it('sorts by usage count', async () => {
    const cats = [
      makeCategory('1', { name: 'Low', transactionsCount: 1 }),
      makeCategory('2', { name: 'High', transactionsCount: 10 }),
    ];
    renderCategoriesClient(cats);

    const usageSortBtn = screen.getByLabelText('Sort by transaction usage count');
    await userEvent.click(usageSortBtn);

    // Ascending: Low (1) before High (10)
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.textContent).toContain('Low');
  });
});

describe('CategoriesClient — Escape key handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  function getDialog(): HTMLElement | null {
    return screen.queryByRole('dialog');
  }

  it('closes edit modal on Escape', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);
    await waitFor(() => {
      expect(screen.getByText('Edit Category')).toBeDefined();
    });

    const dialog = getDialog();
    expect(dialog).not.toBeNull();
    fireEvent.keyDown(dialog!, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Edit Category')).toBeNull();
    });
  });

  it('closes delete confirmation on Escape', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const deleteBtn = screen.getByLabelText('Delete Food');
    await userEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeDefined();
    });

    const dialog = getDialog();
    expect(dialog).not.toBeNull();
    fireEvent.keyDown(dialog!, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).toBeNull();
    });
  });

  it('closes discard confirmation on Escape', async () => {
    const cats = [makeCategory('1', { name: 'Food' })];
    renderCategoriesClient(cats);

    const editBtn = screen.getByLabelText('Edit Food');
    await userEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');

    // Click cancel to trigger discard confirm
    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.getByText('Discard Changes')).toBeDefined();
    });

    // Get the discard dialog (it's rendered as a separate dialog)
    const dialogs = screen.getAllByRole('dialog');
    // The discard modal is the last dialog (higher z-index)
    const discardDialog = dialogs[dialogs.length - 1];
    fireEvent.keyDown(discardDialog, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Discard Changes')).toBeNull();
    });
  });
});

describe('CategoriesClient — Match Rules tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows empty state when switching to rules tab with no rules', async () => {
    renderCategoriesClient();
    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    expect(screen.getByText('No match rules yet')).toBeDefined();
  });

  it('shows rules grouped by category', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        rulesCount: 2,
        rules: [
          { id: 'r1', pattern: 'Restaurant' },
          { id: 'r2', pattern: 'Cafe' },
        ],
      }),
    ];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    const foodEls = screen.getAllByText('Food');
    expect(foodEls.length).toBeGreaterThanOrEqual(1);
    // Use getAllByText since the pattern appears in aria-label too
    const patterns = screen.getAllByText(/".*"/);
    expect(patterns.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a rule successfully', async () => {
    mockCreateCategoryRule.mockResolvedValue({ id: 'new-rule', pattern: 'Uber' });
    const cats = [makeCategory('1', { name: 'Transport' })];
    renderCategoriesClient(cats);

    // Switch to rules tab
    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    // Fill out the rule form
    const patternInput = screen.getByPlaceholderText('e.g. Uber, Coles');
    await userEvent.type(patternInput, 'Uber');

    const submitBtn = screen.getByRole('button', { name: 'Create Rule' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCategoryRule).toHaveBeenCalledWith('Uber', '1');
    });
  });

  it('shows success toast after creating a rule', async () => {
    mockCreateCategoryRule.mockResolvedValue({ id: 'new-rule', pattern: 'Uber' });
    const cats = [makeCategory('1', { name: 'Transport' })];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    const patternInput = screen.getByPlaceholderText('e.g. Uber, Coles');
    await userEvent.type(patternInput, 'Uber');

    const submitBtn = screen.getByRole('button', { name: 'Create Rule' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Match rule for "Uber" created successfully')).toBeDefined();
    });
  });

  it('shows summary stats', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        rulesCount: 2,
        rules: [
          { id: 'r1', pattern: 'Restaurant' },
          { id: 'r2', pattern: 'Cafe' },
        ],
      }),
      makeCategory('2', { name: 'Rent', rulesCount: 0, rules: [] }),
    ];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    expect(screen.getByText('Summary')).toBeDefined();
    // Summary stats show numbers
    const summaryCards = screen.getAllByText(/^\d+$/);
    expect(summaryCards.length).toBeGreaterThanOrEqual(2);
  });
});

describe('CategoriesClient — rules deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockDeleteCategoryRule.mockResolvedValue(undefined);
  });

  it('deletes a rule from the rules tab', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        rulesCount: 1,
        rules: [{ id: 'r1', pattern: 'Restaurant' }],
      }),
    ];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    // Find the delete button for the rule
    const deleteBtn = screen.getByLabelText('Are you sure you want to delete the rule matching "Restaurant"?');
    await userEvent.click(deleteBtn);

    // Delete rule modal should appear
    expect(screen.getByText('Confirm Rule Delete')).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByText('Delete');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteCategoryRule).toHaveBeenCalledWith('r1');
    });
  });

  it('shows success toast after deleting a rule', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        rulesCount: 1,
        rules: [{ id: 'r1', pattern: 'Restaurant' }],
      }),
    ];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    const deleteBtn = screen.getByLabelText('Are you sure you want to delete the rule matching "Restaurant"?');
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByText('Delete');
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Rule for "Restaurant" deleted successfully')).toBeDefined();
    });
  });

  it('closes delete rule modal on Escape', async () => {
    const cats = [
      makeCategory('1', {
        name: 'Food',
        rulesCount: 1,
        rules: [{ id: 'r1', pattern: 'Restaurant' }],
      }),
    ];
    renderCategoriesClient(cats);

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    const deleteBtn = screen.getByLabelText('Are you sure you want to delete the rule matching "Restaurant"?');
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Rule Delete')).toBeDefined();
    });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Confirm Rule Delete')).toBeNull();
    });
  });
});

describe('CategoriesClient — scrolling on tab switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    // Mock scrollTo
    window.scrollTo = vi.fn();
  });

  it('calls scrollTo when switching tabs', async () => {
    renderCategoriesClient();

    const rulesTab = screen.getAllByText('Match Rules')[0];
    await userEvent.click(rulesTab);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('CategoriesClient — toast behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('allows dismissing toasts manually', async () => {
    mockCreateCategory.mockResolvedValue(makeCategory('new-1', { name: 'Test' }));
    renderCategoriesClient();

    const nameInput = await screen.findByPlaceholderText('e.g. Dining Out, Freelance');
    await userEvent.type(nameInput, 'Test');
    const submitBtn = screen.getByRole('button', { name: 'Create Category' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Category "Test" created successfully')).toBeDefined();
    });

    // Dismiss the toast
    const dismissBtn = screen.getByLabelText('Dismiss notification');
    await userEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText('Category "Test" created successfully')).toBeNull();
    });
  });
});
