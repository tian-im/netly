'use client';

import { useState, useTransition } from 'react';
import { createCategory, deleteCategory } from '../actions';

interface Category {
  id: string;
  name: string;
  type: string;
  cashFlowType: string;
  transactionsCount: number;
  rulesCount: number;
}

interface CategoriesClientProps {
  initialCategories: Category[];
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('EXPENSE');
  const [newCatCFType, setNewCatCFType] = useState('OPERATING');
  const [isPending, startTransition] = useTransition();

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
        };
        setCategories((prev) => [...prev, mappedCreated].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCatName('');
        setNewCatType('EXPENSE');
        setNewCatCFType('OPERATING');
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

  return (
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
  );
}
