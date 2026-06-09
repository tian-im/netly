'use client';

import { useTransition } from 'react';
import { resetDatabase } from '../actions';

interface SettingsClientProps {
  accountsCount: number;
  transactionsCount: number;
  rulesCount: number;
}

export default function SettingsClient({
  accountsCount,
  transactionsCount,
  rulesCount,
}: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleResetDb = async () => {
    if (!confirm('WARNING: This will wipe all accounts, transactions, and categories! Are you sure?')) return;
    
    startTransition(async () => {
      try {
        await resetDatabase();
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'Failed to reset database');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* DB Stats Cards */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary mb-4">📊 Local Database Metrics</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200/50 w-full overflow-hidden">
            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">Managed Accounts</div>
              <div className="stat-value text-2xl font-black mt-1 text-primary">{accountsCount}</div>
              <div className="stat-desc mt-1">Checking, savings, or cards</div>
            </div>

            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">Total Transactions</div>
              <div className="stat-value text-2xl font-black mt-1 text-secondary">{transactionsCount}</div>
              <div className="stat-desc mt-1">Imported from bank statements</div>
            </div>

            <div className="stat">
              <div className="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/60">Matching Rules</div>
              <div className="stat-value text-2xl font-black mt-1 text-accent">{rulesCount}</div>
              <div className="stat-desc mt-1">Payee auto-categorization maps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone Reset card */}
      <div className="card bg-base-100 shadow-xl border border-error/25">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold text-error flex items-center gap-2">
            ⚠️ Danger Zone
          </h2>
          <p className="text-sm text-base-content/70">
            Wiping the database deletes all ledger accounts, uploaded CSV bank transactions, and auto-matching rules. This action is permanent and cannot be undone.
          </p>
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              Database Path: <code className="bg-base-200 px-1.5 py-0.5 rounded font-mono">prisma/dev.db</code>
            </div>
            <button
              onClick={handleResetDb}
              className="btn btn-error btn-md gap-2"
              disabled={isPending}
            >
              {isPending ? 'Wiping Database...' : '🗑️ Wipe Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
