'use client';

import { useState, useEffect, useTransition } from 'react';
import { getTransactions, getAccounts, getCategories, updateTransactionCategory, createCategoryRule, deleteCategoryRule } from '../actions';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filter states
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Rules manager states
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCatId, setNewRuleCatId] = useState('');

  // Prompt states for creating global rules on manual categorization
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [promptTx, setPromptTx] = useState<any | null>(null);
  const [promptCatId, setPromptCatId] = useState('');

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const txs = await getTransactions();
    const accs = await getAccounts();
    const cats = await getCategories();
    setTransactions(txs);
    setAccounts(accs);
    setCategories(cats);
    if (cats.length > 0 && !newRuleCatId) {
      setNewRuleCatId(cats[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCategoryChange = async (tx: any, catId: string) => {
    if (!catId) {
      // Uncategorize
      startTransition(async () => {
        await updateTransactionCategory(tx.id, null);
        await loadData();
      });
      return;
    }

    // If categorizing, prompt user to optionally create a global rule for the payee merchant
    setPromptTx(tx);
    setPromptCatId(catId);
    setShowRulePrompt(true);
  };

  const executeCategorization = async (createRule: boolean) => {
    if (!promptTx) return;

    startTransition(async () => {
      try {
        await updateTransactionCategory(promptTx.id, promptCatId, createRule);
        setShowRulePrompt(false);
        setPromptTx(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to update transaction');
      }
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim() || !newRuleCatId) return;

    startTransition(async () => {
      try {
        await createCategoryRule(newRulePattern, newRuleCatId);
        setNewRulePattern('');
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to create rule');
      }
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    startTransition(async () => {
      await deleteCategoryRule(ruleId);
      await loadData();
    });
  };

  // Filter and search computation
  const filteredTransactions = transactions.filter((tx) => {
    const matchesAccount = !selectedAccountId || tx.accountId === selectedAccountId;
    const matchesCategory = !selectedCategoryId || tx.categoryId === selectedCategoryId;
    
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      tx.payee.toLowerCase().includes(lowerSearch) ||
      (tx.description && tx.description.toLowerCase().includes(lowerSearch));

    return matchesAccount && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
            Transaction Ledger
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Review transactions, categorize them, and define match rules to automate future statements.
          </p>
        </div>
      </div>

      {/* Tabs / Multi-section: Ledger and Rules Manager */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Transactions List */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Filters Bar */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Account filter */}
              <div className="form-control w-full md:w-auto">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Category filter */}
              <div className="form-control w-full md:w-auto">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              {/* Search filter */}
              <div className="form-control w-full md:flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-base-content/40">🔍</span>
                  <input
                    type="text"
                    placeholder="Search payee or memo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-bordered input-sm w-full pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-base-200">
                    <th>Date</th>
                    <th>Account</th>
                    <th>Payee</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-base-content/40">
                        No transactions found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        className={`hover:bg-base-200/50 border-b border-base-200 ${!tx.isReviewed ? 'bg-warning/5 border-l-4 border-l-warning' : ''}`}
                      >
                        <td className="font-mono text-xs">
                          {new Date(tx.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </td>
                        <td className="text-xs font-semibold max-w-[120px] truncate">
                          {tx.account.name}
                        </td>
                        <td>
                          <div className="font-bold text-sm">{tx.payee}</div>
                          {tx.description && (
                            <div className="text-xs text-base-content/45 max-w-[250px] truncate">
                              {tx.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <select
                            value={tx.categoryId || ''}
                            onChange={(e) => handleCategoryChange(tx, e.target.value)}
                            className={`select select-bordered select-xs w-full max-w-[180px] font-semibold ${!tx.categoryId ? 'select-warning text-warning-content' : ''}`}
                            disabled={isPending}
                          >
                            <option value="">Uncategorized</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={`text-right font-mono font-bold ${tx.amount >= 0 ? 'text-success' : 'text-error'}`}>
                          {tx.amount >= 0 ? '+' : ''}
                          ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Rules Manager Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Create Rule Form */}
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

          {/* Rules List */}
          <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
            <div className="card-body p-4">
              <h2 className="card-title text-md font-bold uppercase tracking-wider text-primary">
                📜 Current Rules ({categories.reduce((acc, cat) => acc + (cat.rules?.length || 0), 0)})
              </h2>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto px-4 pb-4 space-y-2">
              {categories.map((cat) => {
                if (!cat.rules || cat.rules.length === 0) return null;
                return cat.rules.map((rule: any) => (
                  <div key={rule.id} className="flex justify-between items-center bg-base-200 p-2 rounded-lg text-xs">
                    <div>
                      <span className="font-semibold text-base-content">"{rule.pattern}"</span>
                      <span className="text-[10px] block text-base-content/50 uppercase tracking-widest mt-0.5">
                        {cat.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/10"
                      disabled={isPending}
                    >
                      ✕
                    </button>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Categorization Rule Modal Prompt */}
      {showRulePrompt && promptTx && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-black text-lg text-primary">Create Automations Rule?</h3>
            <p className="py-4 text-sm">
              You mapped transaction <span className="font-bold">"{promptTx.payee}"</span> to category <span className="font-bold">"{categories.find(c => c.id === promptCatId)?.name}"</span>. 
              Would you like to automatically map all future transactions matching this merchant name?
            </p>
            <div className="modal-action">
              <button 
                onClick={() => executeCategorization(false)} 
                className="btn btn-outline"
                disabled={isPending}
              >
                No, just this one
              </button>
              <button 
                onClick={() => executeCategorization(true)} 
                className="btn btn-primary"
                disabled={isPending}
              >
                Yes, save rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
