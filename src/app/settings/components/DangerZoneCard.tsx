import { useState, useTransition } from 'react';
import { AlertTriangle, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { buildLoginUrl } from '@/lib/links';
import { resetDatabase } from '../../actions';
import { Button, Input, Card, Modal } from '@/app/components/ui';

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

  const closeWipeModal = () => {
    setShowWipeModal(false);
    setWipeConfirmInput('');
  };

  return (
    <>
      <Card className="border border-error/20">
        <Card.Body>
          <Card.Title icon={<AlertTriangle className="h-5 w-5 text-error" />} color="error">
            {t('dangerZoneTitle')}
          </Card.Title>
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
        </Card.Body>
      </Card>

      {/* Wipe Confirmation Modal */}
      <Modal
        isOpen={showWipeModal}
        onClose={closeWipeModal}
        aria-labelledby="wipe-modal-title"
      >
        <Modal.Header showBorder onClose={closeWipeModal}>
          <Modal.Title color="error" icon={<ShieldAlert className="h-5 w-5" />} id="wipe-modal-title">
            {t('wipeConfirmTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-3">
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
        </Modal.Body>
        <Modal.Actions>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeWipeModal}
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
        </Modal.Actions>
      </Modal>
    </>
  );
}
