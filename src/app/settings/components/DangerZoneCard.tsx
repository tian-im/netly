import { useState, useTransition, useEffect } from 'react';
import { AlertTriangle, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { buildLoginUrl } from '@/lib/links';
import { resetDatabase } from '../../actions';
import { Button, Input } from '@/app/components/ui';

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

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWipeModal(false);
        setWipeConfirmInput('');
      }
    };
    if (showWipeModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showWipeModal]);

  const handleResetDbConfirm = async () => {
    if (wipeConfirmInput.trim().toUpperCase() !== 'WIPE') return;

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
      router.push(buildLoginUrl());
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
            <Button
              variant="outline-error"
              size="md"
              onClick={() => setShowWipeModal(true)}
              disabled={isPending}
              icon={<Trash2 className="h-4 w-4" />}
            >
              {t('wipeDbBtn')}
            </Button>
          </div>
          <div className="divider my-2"></div>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="text-xs text-base-content/50">
              <LogOut className="h-4 w-4 inline mr-1" />
              {t('signOutLabel')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              loading={isLoggingOut}
              icon={<LogOut className="h-4 w-4" />}
            >
              {t('signOutBtn')}
            </Button>
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
              <Input
                id="wipe-confirm-input"
                label={t.rich('wipeConfirmPrompt', {
                  word: (chunks) => <strong className="text-error">{chunks}</strong>
                })}
                type="text"
                value={wipeConfirmInput}
                onChange={(e) => setWipeConfirmInput(e.target.value)}
                className="font-bold"
                disabled={isPending}
              />
            </div>

            <div className="modal-action">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                disabled={isPending}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="outline-error"
                size="sm"
                onClick={handleResetDbConfirm}
                loading={isPending}
                disabled={wipeConfirmInput.trim().toUpperCase() !== 'WIPE'}
              >
                {t('wipeAllBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
