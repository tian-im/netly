'use client';

import { useState, useTransition } from 'react';
import { createCategory, deleteCategory, createCategoryRule, deleteCategoryRule } from '../actions';

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

  const [isPending, startTransition] = useTransition();

  // ─── Category handlers ────────────────────────────────────────────────────

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

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
        setCategories((prev) =>
          [...prev, mappedCreated].sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewCatName('');
        setNewCatType('EXPENSE');
        setNewCatCFType('OPERATING');
        // Make sure the new category is selectable in rule form
        if (!newRuleCatId) setNewRuleCatId(created.id);
      } catch (err: any) {
        alert(err.message || 'Failed to create category');
      }
    });
  };

  const handleDeleteCategory = async (cat: Category) => {
    const isProtected = cat.name.toLowerCase() === 'transfer';
    if (isProtected) {
      alert('The "Transfer" category is critical and cannot be deleted.');
      return;
    }

    let msg = `Are you sure you want to delete the category "${cat.name}"?`;
    if (cat.transactionsCount > 0) {
      msg = `WARNING: Category "${cat.name}" is currently assigned to ${cat.transactionsCount} transaction(s). Deleting it will mark those transactions as "Uncategorized". Do you want to proceed?`;
    }

    if (!confirm(msg)) return;

    startTransition(async () => {
      try {
        await deleteCategory(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    });
  };

  // ─── Rule handlers ────────────────────────────────────────────────────────

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim() || !newRuleCatId) return;

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
      } catch (err: any) {
        alert(err.message || 'Failed to create rule');
      }
    });
  };

  const handleDeleteRule = async (ruleId: string, catId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    startTransition(async () => {
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
    });
  };

  const totalRules = categories.reduce((acc, c) => acc + (c.rules?.length ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Sub-menu tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${activeTab === 'categories' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          🏷️ Categories
          <span className="badge badge-sm badge-neutral">{categories.length}</span>
        </button>
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${activeTab === 'rules' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('rules')}
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
                <div className="overflow-x-auto mt-4">
                  <table className="table w-full">
                    <thead>
                      <tr className="border-b border-base-200">
                        <th>Category Name</th>
                        <th>Type</th>
                        <th>Cash Flow Section</th>
                        <th className="text-center">Usage</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => {
                        const isTransfer = cat.name.toLowerCase() === 'transfer';
                        return (
                          <tr key={cat.id} className="hover:bg-base-200/50 border-b border-base-200">
                            <td>
                              <div className="font-bold">{cat.name}</div>
                              <div className="text-xs text-base-content/50">
                                {cat.rulesCount || 0} match rule(s)
                              </div>
                            </td>
                            <td>
                              <span className={`badge badge-sm font-semibold ${
                                cat.type === 'INCOME'
                                  ? 'badge-success text-success-content'
                                  : cat.type === 'EXPENSE'
                                  ? 'badge-error text-error-content'
                                  : 'badge-warning text-warning-content'
                              }`}>
                                {cat.type}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-outline badge-sm font-bold opacity-75">
                                {cat.cashFlowType}
                              </span>
                            </td>
                            <td className="text-center font-mono font-bold text-sm">
                              {cat.transactionsCount} tx
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                disabled={isPending || isTransfer}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                    <label className="label">
                      <span className="label-text font-bold">Category Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dining Out, Freelance"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="input input-bordered w-full"
                      required
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-bold">Category Type</span>
                    </label>
                    <select
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value)}
                      className="select select-bordered w-full"
                    >
                      <option value="EXPENSE">EXPENSE (Outflow / Spending)</option>
                      <option value="INCOME">INCOME (Inflow / Earnings)</option>
                      <option value="TRANSFER">TRANSFER (Account to Account)</option>
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-bold">Cash Flow Section</span>
                    </label>
                    <select
                      value={newCatCFType}
                      onChange={(e) => setNewCatCFType(e.target.value)}
                      className="select select-bordered w-full"
                    >
                      <option value="OPERATING">OPERATING (Daily business / living)</option>
                      <option value="INVESTING">INVESTING (Buying / selling assets)</option>
                      <option value="FINANCING">FINANCING (Loans / debt / capital)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full mt-2"
                    disabled={isPending || !newCatName.trim()}
                  >
                    {isPending ? 'Creating...' : 'Create Category'}
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
                    Create keyword rules to auto-categorize future statement uploads. Rules are matched against transaction payee names and descriptions.
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
                        <span className={`badge badge-sm font-semibold ${
                          cat.type === 'INCOME'
                            ? 'badge-success text-success-content'
                            : cat.type === 'EXPENSE'
                            ? 'badge-error text-error-content'
                            : 'badge-warning text-warning-content'
                        }`}>
                          {cat.type}
                        </span>
                        <span className="badge badge-ghost badge-sm ml-auto">{cat.rules.length} rule(s)</span>
                      </div>
                      <div className="space-y-2">
                        {cat.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex justify-between items-center bg-base-200 px-3 py-2 rounded-lg text-sm"
                          >
                            <span className="font-mono font-semibold text-primary">"{rule.pattern}"</span>
                            <button
                              onClick={() => handleDeleteRule(rule.id, cat.id)}
                              className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/10"
                              disabled={isPending}
                              title="Delete rule"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
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
                    <label className="label">
                      <span className="label-text font-semibold text-xs">Merchant Keyword</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Uber, Coles"
                      value={newRulePattern}
                      onChange={(e) => setNewRulePattern(e.target.value)}
                      className="input input-bordered input-sm"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-xs">Assign Category</span>
                    </label>
                    <select
                      value={newRuleCatId}
                      onChange={(e) => setNewRuleCatId(e.target.value)}
                      className="select select-bordered select-sm"
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm w-full mt-2"
                    disabled={isPending || !newRulePattern.trim()}
                  >
                    Create Rule
                  </button>
                </form>
              </div>
            </div>

            {/* Summary stats */}
            <div className="card bg-base-100 shadow border border-base-200 mt-4">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm text-base-content/60 uppercase tracking-wider mb-3">Summary</h3>
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
    </div>
  );
}
