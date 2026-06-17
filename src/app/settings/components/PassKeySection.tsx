import { useState, useRef, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { translateError } from '@/lib/translateError';
import { KeyRound, Trash2, Plus, Copy, AlertTriangle } from 'lucide-react';
import { PassKeyInfo } from '@/types/settings';

interface PassKeySectionProps {
  initialPassKeys: PassKeyInfo[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PassKeySection({ initialPassKeys, showToast }: PassKeySectionProps) {
  const tPasskey = useTranslations('passkey.settings');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const format = useFormatter();

  const [passKeys, setPassKeys] = useState<PassKeyInfo[]>(initialPassKeys);
  const [isPending, setIsPending] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showAddPassKeyModal, setShowAddPassKeyModal] = useState(false);
  const [passKeyToDelete, setPassKeyToDelete] = useState<PassKeyInfo | null>(null);
  
  const [setupToken, setSetupToken] = useState<{ token: string; url: string; expiresAt: number } | null>(null);
  const [showSetupTokenModal, setShowSetupTokenModal] = useState(false);
  
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const tokenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (tokenTimeoutRef.current) clearTimeout(tokenTimeoutRef.current);
      if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
    };
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddPassKeyModal) {
          setShowAddPassKeyModal(false);
          setNewDeviceName('');
        } else if (showSetupTokenModal) {
          setShowSetupTokenModal(false);
          setSetupToken(null);
        } else if (passKeyToDelete) {
          setPassKeyToDelete(null);
        }
      }
    };
    if (showAddPassKeyModal || showSetupTokenModal || passKeyToDelete) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showAddPassKeyModal, showSetupTokenModal, passKeyToDelete]);

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    if (tokenTimeoutRef.current) clearTimeout(tokenTimeoutRef.current);
    tokenTimeoutRef.current = setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
    urlTimeoutRef.current = setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleAddPassKey = async () => {
    if (!newDeviceName.trim()) return;

    setIsPending(true);
    try {
      const beginRes = await fetch('/api/auth/register/begin', { method: 'POST' });
      if (!beginRes.ok) {
        throw new Error('ERR_UNKNOWN');
      }

      const options = await beginRes.json();
      const { state, ...regOptions } = options;

      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResponse = await startRegistration(regOptions);

      const completeRes = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, deviceName: newDeviceName.trim(), ...regResponse }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error);
      }

      setShowAddPassKeyModal(false);
      setNewDeviceName('');
      showToast(tPasskey('addedSuccess'));

      const credRes = await fetch('/api/auth/credentials');
      if (credRes.ok) {
        setPassKeys(await credRes.json());
      } else {
        console.warn('Failed to refresh credentials list');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tErrors(translateError(msg)), 'error');
    } finally {
      setIsPending(false);
    }
  };

  const handleGenerateSetupToken = async () => {
    setIsPending(true);
    try {
      const res = await fetch('/api/auth/setup-token/generate', { method: 'POST' });
      if (!res.ok) {
        throw new Error('ERR_UNKNOWN');
      }
      const data = await res.json();
      setSetupToken(data);
      setShowSetupTokenModal(true);
      setCopiedToken(false);
      setCopiedUrl(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tErrors(translateError(msg)), 'error');
    } finally {
      setIsPending(false);
    }
  };

  const handleDeletePassKey = async (id: string) => {
    if (passKeys.length <= 1) return;
    setIsPending(true);
    try {
      const res = await fetch('/api/auth/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setPassKeys((prev) => prev.filter((pk) => pk.id !== id));
      showToast(tPasskey('removedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tErrors(translateError(msg)), 'error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {tPasskey('title')}
          </h2>
          <p className="text-xs text-base-content/60 mb-4">
            {tPasskey('desc')}
          </p>

          <div className="space-y-2">
            {passKeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {pk.deviceName || tPasskey('unnamed')}
                    </p>
                    <p className="text-xs text-base-content/40">
                      {tPasskey('added')}{' '}
                      {format.dateTime(new Date(pk.createdAt), { dateStyle: 'medium' })}
                      {pk.lastUsedAt &&
                        ` · ${tPasskey('lastUsed')} ${format.dateTime(new Date(pk.lastUsedAt), {
                          dateStyle: 'medium',
                        })}`}
                    </p>
                  </div>
                </div>
                {/* Wrap the button in a tooltip if disabled */}
                <div
                  className={passKeys.length <= 1 ? 'tooltip tooltip-left' : ''}
                  data-tip={passKeys.length <= 1 ? tPasskey('cannotRemoveLast') : undefined}
                >
                  <button
                    onClick={() => setPassKeyToDelete(pk)}
                    disabled={isPending || passKeys.length <= 1}
                    className="btn btn-ghost btn-xs text-error gap-1"
                    title={passKeys.length <= 1 ? tPasskey('cannotRemoveLast') : tPasskey('remove')}
                    aria-label={tPasskey('remove') + ' - ' + (pk.deviceName || tPasskey('unnamed'))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {passKeys.length === 0 && (
            <p className="text-sm text-base-content/40 text-center py-4">
              {tPasskey('noPasskeys')}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setShowAddPassKeyModal(true)}
              className="btn btn-outline btn-primary btn-sm gap-2"
              disabled={isPending}
            >
              <Plus className="h-4 w-4" />
              {tPasskey('addBtn')}
            </button>
            <button
              onClick={handleGenerateSetupToken}
              disabled={isPending}
              className="btn btn-outline btn-secondary btn-sm gap-2"
            >
              {isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {tPasskey('addDeviceBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Add PassKey Modal */}
      {showAddPassKeyModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="add-passkey-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="add-passkey-title" className="font-bold text-lg text-primary flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {tPasskey('modalTitle')}
            </h3>
            <div className="py-4 space-y-3">
              <p className="text-sm text-base-content/80">{tPasskey('modalDesc')}</p>
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="new-passkey-name">
                  <span className="label-text font-semibold text-base-content/75">
                    {tPasskey('deviceName')}
                  </span>
                </label>
                <input
                  id="new-passkey-name"
                  type="text"
                  placeholder={tPasskey('deviceNamePlaceholder')}
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="input input-bordered w-full"
                  disabled={isPending}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowAddPassKeyModal(false);
                  setNewDeviceName('');
                }}
                className="btn btn-ghost btn-sm"
                disabled={isPending}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddPassKey}
                className="btn btn-primary btn-sm gap-2"
                disabled={isPending || !newDeviceName.trim()}
              >
                {isPending ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isPending ? tPasskey('registering') : tPasskey('registerBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Token Modal */}
      {showSetupTokenModal && setupToken && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="setup-token-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="setup-token-title" className="font-bold text-lg text-primary flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {tPasskey('setupTokenModalTitle')}
            </h3>
            <div className="py-4 space-y-4">
              <p className="text-sm text-base-content/80">{tPasskey('setupTokenModalDesc')}</p>

              <div className="space-y-3">
                {/* Code field */}
                <div className="form-control w-full">
                  <span className="label-text font-semibold text-base-content/75 mb-1">
                    {tPasskey('setupTokenLabel')}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={setupToken.token}
                      className="input input-bordered font-mono font-bold text-center tracking-wider w-full text-lg bg-base-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyToken(setupToken.token)}
                      className="btn btn-primary btn-square"
                      title={tCommon('copy')}
                      aria-label={tCommon('copy')}
                    >
                      {copiedToken ? (
                        <span className="text-xs font-bold">{tCommon('copiedSuccess')}</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* URL field */}
                <div className="form-control w-full">
                  <span className="label-text font-semibold text-base-content/75 mb-1">
                    {tPasskey('setupUrlLabel')}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={setupToken.url}
                      className="input input-bordered text-xs w-full bg-base-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(setupToken.url)}
                      className="btn btn-primary btn-square"
                      title={tCommon('copy')}
                      aria-label={tCommon('copy')}
                    >
                      {copiedUrl ? (
                        <span className="text-xs font-bold">{tCommon('copiedSuccess')}</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning text-xs mt-2 gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning-content" />
                <span className="text-warning-content font-semibold">
                  {tPasskey('setupTokenExpires')}
                </span>
              </div>
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowSetupTokenModal(false);
                  setSetupToken(null);
                }}
                className="btn btn-sm"
              >
                {tCommon('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete PassKey Confirmation Modal */}
      {passKeyToDelete && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="delete-passkey-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="delete-passkey-title" className="font-bold text-lg text-error flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {tPasskey('removeConfirmTitle')}
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              {tPasskey('removeConfirmWarning', { name: passKeyToDelete.deviceName || tPasskey('unnamed') })}
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setPassKeyToDelete(null)}
                className="btn btn-ghost btn-sm"
                disabled={isPending}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDeletePassKey(passKeyToDelete.id);
                  setPassKeyToDelete(null);
                }}
                className="btn btn-error btn-sm"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  tPasskey('removeConfirmBtn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
