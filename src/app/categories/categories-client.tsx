'use client';

import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  createCategory,
  deleteCategory,
  createCategoryRule,
  deleteCategoryRule,
  updateCategory,
} from '../actions';
import { translateError } from '@/lib/translateError';
import { Tags, Settings } from 'lucide-react';
import type { Category, Toast } from './types';
import CategoryTable from './components/CategoryTable';
import CreateCategoryForm from './components/CreateCategoryForm';
import EditCategoryModal from './components/EditCategoryModal';
import DeleteCategoryModal from './components/DeleteCategoryModal';
import RulesPanel from './components/RulesPanel';
import DeleteRuleModal from './components/DeleteRuleModal';
import ToastContainer from './components/ToastContainer';

export type { Category, Toast };

interface CategoriesClientProps {
  initialCategories: Category[];
}

type ActiveTab = 'categories' | 'rules';

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  const [categories, setCategories] = useState(initialCategories);

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete category confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Delete rule confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<{ id: string; catId: string; pattern: string } | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Action Pending States
  const [, startTransition] = useTransition();
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Table Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'type' | 'cashFlowType' | 'usage' | 'rules'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Tracks the most recently created category ID for rules form auto-selection
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleSort = (field: 'name' | 'type' | 'cashFlowType' | 'usage' | 'rules') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Memoized filtered and sorted categories
  const sortedCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = categories.filter((c) => {
      if (!query) return true;
      const matchesRule = c.rules?.some((rule) =>
        rule.pattern.toLowerCase().includes(query)
      );
      return (
        c.name.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query) ||
        c.cashFlowType.toLowerCase().includes(query) ||
        matchesRule
      );
    });

    filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'name') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * (sortDirection === 'asc' ? 1 : -1);
      } else if (sortField === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortField === 'cashFlowType') {
        valA = a.cashFlowType;
        valB = b.cashFlowType;
      } else if (sortField === 'usage') {
        valA = a.transactionsCount;
        valB = b.transactionsCount;
      } else if (sortField === 'rules') {
        valA = a.rulesCount;
        valB = b.rulesCount;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [categories, searchQuery, sortField, sortDirection]);

  // ─── Category handlers ────────────────────────────────────────────────────

  const handleCreateCategory = async (name: string, type: string, cfType: string) => {
    setIsCreatingCategory(true);
    startTransition(async () => {
      try {
        const created = await createCategory(name, type, cfType);
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
        setCreatedCategoryId(created.id);
        showToast(t('createdSuccess', { name: created.name }));
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setIsCreatingCategory(false);
      }
    });
  };

  const handleUpdateCategory = async (id: string, name: string, type: string, cfType: string) => {
    setIsUpdating(true);
    startTransition(async () => {
      try {
        const updated = await updateCategory(id, name, type, cfType);
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
        showToast(t('updatedSuccess', { name: updated.name }));
        setEditingCategory(null);
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const handleDeleteClick = (cat: Category) => {
    const isProtected = cat.type === 'TRANSFER';
    if (isProtected) {
      showToast(t('transferProtected'), 'error');
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
        showToast(t('deletedSuccess', { name: targetName }));
        setCategoryToDelete(null);
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setDeletingCategoryId(null);
      }
    });
  };

  // ─── Rule handlers ──────────────────────────────────────────────────────

  const handleCreateRule = async (pattern: string, categoryId: string) => {
    setIsCreatingRule(true);
    startTransition(async () => {
      try {
        const rule = await createCategoryRule(pattern, categoryId);
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId
              ? {
                  ...cat,
                  rules: [...cat.rules, rule],
                  rulesCount: cat.rulesCount + 1,
                }
              : cat
          )
        );
        showToast(t('ruleCreatedSuccess', { pattern: rule.pattern }));
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setIsCreatingRule(false);
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
        showToast(t('ruleDeletedSuccess', { pattern }));
        setRuleToDelete(null);
      } catch (err: any) {
        showToast(tErr(translateError(err)), 'error');
      } finally {
        setDeletingRuleId(null);
      }
    });
  };

  const totalRules = categories.reduce((acc, c) => acc + (c.rules?.length ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('title')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Sub-menu tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${
            activeTab === 'categories' ? 'tab-active' : ''
          }`}
          onClick={() => { setActiveTab('categories'); window.scrollTo(0, 0); }}
          aria-label={`View Categories tab. Total categories: ${categories.length}`}
        >
          <Tags className="h-5 w-5" /> {t('categories')}
          <span className="badge badge-sm badge-neutral">{categories.length}</span>
        </button>
        <button
          className={`tab tab-lg font-semibold gap-2 transition-all ${
            activeTab === 'rules' ? 'tab-active' : ''
          }`}
          onClick={() => { setActiveTab('rules'); window.scrollTo(0, 0); }}
          aria-label={`View Match Rules tab. Total rules: ${totalRules}`}
        >
          <Settings className="h-5 w-5" /> {t('matchRules')}
          <span className="badge badge-sm badge-neutral">{totalRules}</span>
        </button>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Categories List */}
          <div className="lg:col-span-2">
            <CategoryTable
              categories={categories}
              sortedCategories={sortedCategories}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              isUpdating={isUpdating}
              deletingCategoryId={deletingCategoryId}
              onEdit={setEditingCategory}
              onDeleteClick={handleDeleteClick}
            />
          </div>

          {/* Right column: Create Category Form */}
          <div>
            <CreateCategoryForm
              isCreating={isCreatingCategory}
              onSubmit={handleCreateCategory}
            />
          </div>
        </div>
      )}

      {/* ── MATCH RULES TAB ── */}
      {activeTab === 'rules' && (
        <RulesPanel
          categories={categories}
          isCreatingRule={isCreatingRule}
          deletingRuleId={deletingRuleId}
          onCreateRule={handleCreateRule}
          onDeleteRuleClick={handleDeleteRuleClick}
          createdCategoryId={createdCategoryId}
          onSelectCreatedCategory={() => setCreatedCategoryId(null)}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          key={editingCategory.id}
          editingCategory={editingCategory}
          isUpdating={isUpdating}
          onSave={handleUpdateCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <DeleteCategoryModal
          key={categoryToDelete.id}
          categoryToDelete={categoryToDelete}
          isDeleting={deletingCategoryId === categoryToDelete.id}
          onConfirm={handleDeleteConfirm}
          onClose={() => setCategoryToDelete(null)}
        />
      )}

      {/* Delete Rule Confirmation Modal */}
      {ruleToDelete && (
        <DeleteRuleModal
          key={ruleToDelete.id}
          ruleToDelete={ruleToDelete}
          isDeleting={deletingRuleId === ruleToDelete.id}
          onConfirm={handleDeleteRuleConfirm}
          onClose={() => setRuleToDelete(null)}
        />
      )}

      {/* Toasts Notification Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
