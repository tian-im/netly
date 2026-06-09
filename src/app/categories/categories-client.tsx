'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  createCategory,
  deleteCategory,
  createCategoryRule,
  deleteCategoryRule,
  updateCategory,
} from '../actions';

interface Rule {
  id: string;
  pattern: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  cashFlowType: string;
  transactionsCount: number;
  rulesCount: number;
  rules: Rule[];
}

interface CategoriesClientProps {
  initialCategories: Category[];
}

type ActiveTab = 'categories' | 'rules';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  const [categories, setCategories] = useState(initialCategories);

  // Create category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('EXPENSE');
  const [newCatCFType, setNewCatCFType] = useState('OPERATING');

  // Create rule form state
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCatId, setNewRuleCatId] = useState(() => initialCategories[0]?.id ?? '');

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('EXPENSE');
  const [editCFType, setEditCFType] = useState('OPERATING');

  // Delete category confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Delete rule confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<{ id: string; catId: string; pattern: string } | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Action Pending States
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Table Sorting State
  const [sortField, setSortField] = useState<'name' | 'type' | 'cashFlowType' | 'usage'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleSort = (field: 'name' | 'type' | 'cashFlowType' | 'usage') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Memoized sorted categories
  const sortedCategories = useMemo(() => {
    const sorted = [...categories];
    sorted.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortField === 'cashFlowType') {
        valA = a.cashFlowType;
        valB = b.cashFlowType;
      } else if (sortField === 'usage') {
        valA = a.transactionsCount;
        valB = b.transactionsCount;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [categories, sortField, sortDirection]);

  // ─── Category handlers ────────────────────────────────────────────────────

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCreating(true);
    startTransition(async () => {
      try {
        const created = await createCategory(newCatName, newCatType, newCatCFType);
        const mappedCreated: Category = {
          id: created.id,
          name: created.name,
          type: created.type,
          cashFlowType: created.cashFlowType,
          transactionsCount: 0,
          rulesCount: 0,
          rules: [],
        };
        setCategories((prev) => [...prev, mappedCreated]);
        setNewCatName('');
        setNewCatType('EXPENSE');
        setNewCatCFType('OPERATING');
        showToast(`Category "${created.name}" created successfully`);
        // Make sure the new category is selectable in rule form if none selected
        if (!newRuleCatId) setNewRuleCatId(created.id);
      } catch (err: any) {
        showToast(err.message || 'Failed to create category', 'error');
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditType(cat.type);
    setEditCFType(cat.cashFlowType);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setIsUpdating(true);
    startTransition(async () => {
      try {
        const updated = await updateCategory(
          editingCategory.id,
          editName,
          editType,
          editCFType
        );
        setCategories((prev) =>
          prev.map((c) =>
            c.id === updated.id
              ? {
                  ...c,
                  name: updated.name,
                  type: updated.type,
                  cashFlowType: updated.cashFlowType,
                }
              : c
          )
        );
        showToast(`Category "${updated.name}" updated successfully`);
        setEditingCategory(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to update category', 'error');
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const handleDeleteClick = (cat: Category) => {
    const isProtected = cat.name.toLowerCase() === 'transfer';
    if (isProtected) {
      showToast('The "Transfer" category is critical and cannot be deleted.', 'error');
      return;
    }
    setCategoryToDelete(cat);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    const targetId = categoryToDelete.id;
    const targetName = categoryToDelete.name;

    setDeletingCategoryId(targetId);
    startTransition(async () => {
      try {
        await deleteCategory(targetId);
        setCategories((prev) => prev.filter((c) => c.id !== targetId));
        showToast(`Category "${targetName}" deleted successfully`);
        setCategoryToDelete(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete category', 'error');
      } finally {
        setDeletingCategoryId(null);
      }
    });
  };

  // ─── Rule handlers ────────────────────────────────────────────────────────

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim() || !newRuleCatId) return;

    setIsCreating(true);
    startTransition(async () => {
      try {
        const rule = await createCategoryRule(newRulePattern, newRuleCatId);
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === newRuleCatId
              ? {
                  ...cat,
                  rules: [...cat.rules, rule],
                  rulesCount: cat.rulesCount + 1,
                }
              : cat
          )
        );
        setNewRulePattern('');
        showToast(`Match rule for "${rule.pattern}" created successfully`);
      } catch (err: any) {
        showToast(err.message || 'Failed to create rule', 'error');
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleDeleteRuleClick = (ruleId: string, catId: string, pattern: string) => {
    setRuleToDelete({ id: ruleId, catId, pattern });
  };

  const handleDeleteRuleConfirm = async () => {
    if (!ruleToDelete) return;
    const { id: ruleId, catId, pattern } = ruleToDelete;

    setDeletingRuleId(ruleId);
    startTransition(async () => {
      try {
        await deleteCategoryRule(ruleId);
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === catId
              ? {
                  ...cat,
                  rules: cat.rules.filter((r) => r.id !== ruleId),
                  rulesCount: cat.rulesCount - 1,
                }
              : cat
          )
        );
        showToast(`Rule for "${pattern}" deleted successfully`);
        setRuleToDelete(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete rule', 'error');
      } finally {
        setDeletingRuleId(null);
      }
    });
  };

  const totalRules = categories.reduce((acc, c) => acc + (c.rules?.length ?? 0), 0);

  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-base-content/20 ml-1">↕</span>;
    return sortDirection === 'asc' ? (
      <span className="text-primary ml-1">↑</span>
    ) : (
      <span className="text-primary ml-1">↓</span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative">
      {/* Sub-menu tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${
            activeTab === 'categories' ? 'tab-active' : ''
          }`}
          onClick={() => setActiveTab('categories')}
          aria-label={`View Categories tab. Total categories: ${categories.length}`}
        >
          🏷️ Categories
          <span className="badge badge-sm badge-neutral">{categories.length}</span>
        </button>
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${
            activeTab === 'rules' ? 'tab-active' : ''
          }`}
          onClick={() => setActiveTab('rules')}
          aria-label={`View Match Rules tab. Total rules: ${totalRules}`}
        >
          ⚙️ Match Rules
          <span className="badge badge-sm badge-neutral">{totalRules}</span>
        </button>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Categories List */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-primary">
                  🏷️ Stored Categories
                </h2>

                {categories.length === 0 ? (
                  <div className="text-center py-16 text-base-content/50 flex flex-col items-center gap-4">
                    <span className="text-5xl">🏷️</span>
                    <div>
                      <h3 className="font-bold text-lg text-base-content/75">No categories found</h3>
                      <p className="text-sm text-base-content/40 max-w-sm mt-1">
                        Get started by adding a category using the form on the right.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-hidden w-full mt-4">
                    <table className="table w-full table-fixed">
                      <caption className="sr-only">List of transactions categories and actions</caption>
                      <thead>
                        <tr className="border-b border-base-200">
                          <th className="w-[30%]">
                            <button
                              onClick={() => handleSort('name')}
                              className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                              aria-label="Sort by category name"
                            >
                              <span className="truncate">Category Name</span> <SortIndicator field="name" />
                            </button>
                          </th>
                          <th className="w-[18%]">
                            <button
                              onClick={() => handleSort('type')}
                              className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                              aria-label="Sort by category type"
                            >
                              <span>Type</span> <SortIndicator field="type" />
                            </button>
                          </th>
                          <th className="w-[27%]">
                            <button
                              onClick={() => handleSort('cashFlowType')}
                              className="font-bold flex items-center hover:text-primary transition-colors cursor-pointer focus:outline-none w-full text-left"
                              aria-label="Sort by cash flow section"
                            >
                              <span className="truncate">Cash Flow</span> <SortIndicator field="cashFlowType" />
                            </button>
                          </th>
                          <th className="w-[12%] text-center">
                            <button
                              onClick={() => handleSort('usage')}
                              className="font-bold flex items-center justify-center w-full hover:text-primary transition-colors cursor-pointer focus:outline-none"
                              aria-label="Sort by transaction usage count"
                            >
                              <span>Usage</span> <SortIndicator field="usage" />
                            </button>
                          </th>
                          <th className="w-[13%] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCategories.map((cat) => {
                          const isTransfer = cat.name.toLowerCase() === 'transfer';
                          const isDeleting = deletingCategoryId === cat.id;
                          return (
                            <tr key={cat.id} className="hover:bg-base-200/50 border-b border-base-200">
                              <td className="whitespace-normal break-words">
                                <div className="font-bold">{cat.name}</div>
                                <div className="text-xs text-base-content/50 truncate">
                                  {cat.rulesCount || 0} match rule(s)
                                </div>
                              </td>
                              <td className="whitespace-normal">
                                <span
                                  className={`badge badge-sm font-semibold block w-fit truncate ${
                                    cat.type === 'INCOME'
                                      ? 'badge-success text-success-content'
                                      : cat.type === 'EXPENSE'
                                      ? 'badge-error text-error-content'
                                      : 'badge-warning text-warning-content'
                                  }`}
                                >
                                  {cat.type}
                                </span>
                              </td>
                              <td className="whitespace-normal">
                                <span className="badge badge-outline badge-sm font-bold opacity-75 block w-fit truncate">
                                  {cat.cashFlowType}
                                </span>
                              </td>
                              <td className="text-center font-mono font-bold text-sm whitespace-normal">
                                {cat.transactionsCount} tx
                              </td>
                              <td className="text-center whitespace-normal">
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(cat)}
                                    className="btn btn-ghost btn-xs text-info hover:bg-info/10 px-1"
                                    disabled={isPending || isCreating || isUpdating || deletingCategoryId !== null}
                                    aria-label={`Edit ${cat.name}`}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(cat)}
                                    className="btn btn-ghost btn-xs text-error hover:bg-error/10 px-1"
                                    disabled={isPending || isCreating || isUpdating || deletingCategoryId !== null || isTransfer}
                                    aria-label={`Delete ${cat.name}`}
                                  >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Create Category Form */}
          <div>
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-primary">➕ Create Category</h2>
                <form onSubmit={handleCreateCategory} className="space-y-4 mt-2">
                  <div className="form-control w-full">
                    <label className="label" htmlFor="new-category-name">
                      <span className="label-text font-bold">Category Name</span>
                    </label>
                    <input
                      id="new-category-name"
                      type="text"
                      placeholder="e.g. Dining Out, Freelance"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="input input-bordered w-full"
                      required
                      disabled={isCreating}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label" htmlFor="new-category-type">
                      <span className="label-text font-bold">Category Type</span>
                    </label>
                    <select
                      id="new-category-type"
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value)}
                      className="select select-bordered w-full"
                      disabled={isCreating}
                    >
                      <option value="EXPENSE">EXPENSE (Outflow / Spending)</option>
                      <option value="INCOME">INCOME (Inflow / Earnings)</option>
                      <option value="TRANSFER">TRANSFER (Account to Account)</option>
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label" htmlFor="new-category-cf-type">
                      <span className="label-text font-bold">Cash Flow Section</span>
                    </label>
                    <select
                      id="new-category-cf-type"
                      value={newCatCFType}
                      onChange={(e) => setNewCatCFType(e.target.value)}
                      className="select select-bordered w-full"
                      disabled={isCreating}
                    >
                      <option value="OPERATING">OPERATING (Daily business / living)</option>
                      <option value="INVESTING">INVESTING (Buying / selling assets)</option>
                      <option value="FINANCING">FINANCING (Loans / debt / capital)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full mt-2"
                    disabled={isCreating || !newCatName.trim()}
                  >
                    {isCreating ? 'Creating...' : 'Create Category'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MATCH RULES TAB ── */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Rules List grouped by category */}
          <div className="lg:col-span-2 space-y-4">
            {categories.every((cat) => !cat.rules || cat.rules.length === 0) ? (
              <div className="card bg-base-100 shadow border border-base-200">
                <div className="card-body items-center text-center py-16">
                  <span className="text-5xl mb-4">⚙️</span>
                  <h3 className="text-lg font-bold text-base-content/60">No match rules yet</h3>
                  <p className="text-sm text-base-content/40 max-w-xs">
                    Create keyword rules to auto-categorize future statement uploads. Rules are matched against
                    transaction payee names and descriptions.
                  </p>
                </div>
              </div>
            ) : (
              categories.map((cat) => {
                if (!cat.rules || cat.rules.length === 0) return null;
                return (
                  <div key={cat.id} className="card bg-base-100 shadow border border-base-200">
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-base">{cat.name}</h3>
                        <span
                          className={`badge badge-sm font-semibold ${
                            cat.type === 'INCOME'
                              ? 'badge-success text-success-content'
                              : cat.type === 'EXPENSE'
                              ? 'badge-error text-error-content'
                              : 'badge-warning text-warning-content'
                          }`}
                        >
                          {cat.type}
                        </span>
                        <span className="badge badge-ghost badge-sm ml-auto">{cat.rules.length} rule(s)</span>
                      </div>
                      <div className="space-y-2">
                        {cat.rules.map((rule) => {
                          const isDeletingRule = deletingRuleId === rule.id;
                          return (
                            <div
                              key={rule.id}
                              className="flex justify-between items-center bg-base-200 px-3 py-2 rounded-lg text-sm"
                            >
                              <span className="font-mono font-semibold text-primary">"{rule.pattern}"</span>
                              <button
                                onClick={() => handleDeleteRuleClick(rule.id, cat.id, rule.pattern)}
                                className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/10"
                                disabled={isPending || isCreating || deletingRuleId !== null}
                                title="Delete rule"
                                aria-label={`Delete rule matching ${rule.pattern}`}
                              >
                                {isDeletingRule ? '...' : '✕'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right column: Create Rule Form */}
          <div>
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body p-6">
                <h2 className="card-title text-md font-bold uppercase tracking-wider text-primary">
                  ⚙️ Create Match Rule
                </h2>
                <p className="text-xs text-base-content/60">
                  Define keyword rules to auto-categorize future statement uploads.
                </p>

                <form onSubmit={handleCreateRule} className="space-y-4 mt-4">
                  <div className="form-control">
                    <label className="label" htmlFor="new-rule-pattern">
                      <span className="label-text font-semibold text-xs">Merchant Keyword</span>
                    </label>
                    <input
                      id="new-rule-pattern"
                      type="text"
                      placeholder="e.g. Uber, Coles"
                      value={newRulePattern}
                      onChange={(e) => setNewRulePattern(e.target.value)}
                      className="input input-bordered input-sm"
                      required
                      disabled={isCreating || categories.length === 0}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label" htmlFor="new-rule-category">
                      <span className="label-text font-semibold text-xs">Assign Category</span>
                    </label>
                    <select
                      id="new-rule-category"
                      value={newRuleCatId}
                      onChange={(e) => setNewRuleCatId(e.target.value)}
                      className="select select-bordered select-sm"
                      required
                      disabled={isCreating || categories.length === 0}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm w-full mt-2"
                    disabled={isCreating || !newRulePattern.trim() || categories.length === 0}
                  >
                    {isCreating ? 'Creating...' : 'Create Rule'}
                  </button>
                </form>
              </div>
            </div>

            {/* Summary stats */}
            <div className="card bg-base-100 shadow border border-base-200 mt-4">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm text-base-content/60 uppercase tracking-wider mb-3">
                  Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Total rules</span>
                    <span className="font-mono font-bold">{totalRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Categories with rules</span>
                    <span className="font-mono font-bold">
                      {categories.filter((c) => c.rules && c.rules.length > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Categories without rules</span>
                    <span className="font-mono font-bold text-warning">
                      {categories.filter((c) => !c.rules || c.rules.length === 0).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="edit-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
              ✏️ Edit Category
            </h3>

            <form onSubmit={handleUpdateCategory} className="space-y-4 mt-4">
              <div className="form-control w-full">
                <label className="label" htmlFor="edit-category-name">
                  <span className="label-text font-bold">Category Name</span>
                </label>
                <input
                  id="edit-category-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-category-type">
                  <span className="label-text font-bold">Category Type</span>
                </label>
                <select
                  id="edit-category-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
                >
                  <option value="EXPENSE">EXPENSE (Outflow / Spending)</option>
                  <option value="INCOME">INCOME (Inflow / Earnings)</option>
                  <option value="TRANSFER">TRANSFER (Account to Account)</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label" htmlFor="edit-category-cf-type">
                  <span className="label-text font-bold">Cash Flow Section</span>
                </label>
                <select
                  id="edit-category-cf-type"
                  value={editCFType}
                  onChange={(e) => setEditCFType(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={isUpdating}
                >
                  <option value="OPERATING">OPERATING (Daily business / living)</option>
                  <option value="INVESTING">INVESTING (Buying / selling assets)</option>
                  <option value="FINANCING">FINANCING (Loans / debt / capital)</option>
                </select>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="btn btn-ghost"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating || !editName.trim()}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="delete-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              ⚠️ Confirm Delete
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              {categoryToDelete.transactionsCount > 0 ? (
                <span>
                  WARNING: Category <strong className="text-base-content font-extrabold">"{categoryToDelete.name}"</strong> is currently assigned to {categoryToDelete.transactionsCount} transaction(s). Deleting it will mark those transactions as "Uncategorized". Do you want to proceed?
                </span>
              ) : (
                <span>
                  Are you sure you want to delete the category <strong className="text-base-content font-extrabold">"{categoryToDelete.name}"</strong>? This action cannot be undone.
                </span>
              )}
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="btn btn-ghost btn-sm"
                disabled={deletingCategoryId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-error btn-sm"
                disabled={deletingCategoryId !== null}
              >
                {deletingCategoryId !== null ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {ruleToDelete && (
        <div className="modal modal-open z-40" role="dialog" aria-modal="true" aria-labelledby="delete-rule-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="delete-rule-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              ⚠️ Confirm Delete Rule
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              Are you sure you want to delete the match rule for <strong className="text-base-content font-extrabold">"{ruleToDelete.pattern}"</strong>?
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                className="btn btn-ghost btn-sm"
                disabled={deletingRuleId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRuleConfirm}
                className="btn btn-error btn-sm"
                disabled={deletingRuleId !== null}
              >
                {deletingRuleId !== null ? 'Deleting...' : 'Delete Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Notification Container */}
      <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${t.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg border border-white/10`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
