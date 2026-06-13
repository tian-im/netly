import { useState, useTransition } from 'react';
import { AlertTriangle, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { resetDatabase } from '../../actions';

interface DangerZoneCardProps {
  accountsCount: number;
  transactionsCount: number;
  rulesCount: number;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function DangerZoneCard({
  accountsCount,
  transactionsCount,
  rulesCount,
  showToast,
}: DangerZoneCardProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleResetDbConfirm = async () => {
    if (wipeConfirmInput.trim() !== 'WIPE') return;

    startTransition(async () => {
      try {
        await resetDatabase();
        showToast(t('wipeSuccess'));
        setShowWipeModal(false);
        setWipeConfirmInput('');
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg || t('wipeFailed'), 'error');
      }
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Logout request failed');
      }
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || tCommon('error'), 'error');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="card bg-base-100 shadow-xl border border-error/20">
        <div className="card-body">
          <h2 className="card-title text-lg font-bold text-error flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-error" />
            {t('dangerZoneTitle')}
          </h2>
          <p className="text-sm text-base-content/70">
            {t('dangerZoneDesc')}
          </p>
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              {t('dbPathLabel')}{' '}
              <code className="bg-base-200 px-1.5 py-0.5 rounded font-mono">prisma/dev.db</code>
            </div>
            <button
              onClick={() => setShowWipeModal(true)}
              className="btn btn-error btn-md gap-2"
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              {t('wipeDbBtn')}
            </button>
          </div>
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              <LogOut className="h-4 w-4 inline mr-1" />
              {t('signOutLabel')}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-outline btn-sm gap-2"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {t('signOutBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="wipe-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="wipe-modal-title" className="font-bold text-lg text-error flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-error" />
              {t('wipeConfirmTitle')}
            </h3>

            <div className="py-4 text-sm text-base-content/80 space-y-3">
              <p>{t('wipeConfirmWarning')}</p>
              <ul className="list-disc list-inside space-y-1 pl-2 font-semibold text-error/95">
                <li>{t('wipeConfirmAccounts', { count: accountsCount })}</li>
                <li>{t('wipeConfirmTransactions', { count: transactionsCount })}</li>
                <li>{t('wipeConfirmRules', { count: rulesCount })}</li>
              </ul>
              <p>{t('wipeConfirmPermanent')}</p>
              <div className="form-control w-full pt-2">
                <label className="label py-1" htmlFor="wipe-confirm-input">
                  <span className="label-text-alt text-base-content/60">
                    {/* Interpolate next-intl placeholder to render WIPE as a ReactNode */}
                    {t.rich('wipeConfirmPrompt', {
                      word: () => <strong className="text-error">WIPE</strong>
                    })}
                  </span>
                </label>
                <input
                  id="wipe-confirm-input"
                  type="text"
                  placeholder={t('wipeConfirmPlaceholder')}
                  value={wipeConfirmInput}
                  onChange={(e) => setWipeConfirmInput(e.target.value)}
                  className="input input-bordered input-sm w-full font-bold uppercase"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="btn btn-ghost btn-sm"
                disabled={isPending}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetDbConfirm}
                className="btn btn-error btn-sm gap-2"
                disabled={isPending || wipeConfirmInput.trim() !== 'WIPE'}
              >
                {isPending && <span className="loading loading-spinner loading-xs"></span>}
                {isPending ? t('wiping') : t('wipeAllBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
