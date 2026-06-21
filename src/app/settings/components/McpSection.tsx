import { useState, useRef, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { translateError } from '@/lib/translateError';
import { Bot, Trash2, Plus, Copy, AlertTriangle, Check } from 'lucide-react';
import { Button, Input, Card } from '@/app/components/ui';
import { McpTokenInfo } from '@/types/settings';

interface McpSectionProps {
  initialMcpTokens: McpTokenInfo[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function McpSection({ initialMcpTokens, showToast }: McpSectionProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const format = useFormatter();

  const [mcpTokens, setMcpTokens] = useState<McpTokenInfo[]>(initialMcpTokens);
  const [showAddMcpModal, setShowAddMcpModal] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [generatedMcpToken, setGeneratedMcpToken] = useState<{ token: string; name: string } | null>(null);
  const [copiedMcpToken, setCopiedMcpToken] = useState(false);
  const [mcpTokenToRevoke, setMcpTokenToRevoke] = useState<McpTokenInfo | null>(null);

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddMcpModal) {
          setShowAddMcpModal(false);
          setGeneratedMcpToken(null);
          setNewMcpName('');
        } else if (mcpTokenToRevoke) {
          setMcpTokenToRevoke(null);
        }
      }
    };
    if (showAddMcpModal || mcpTokenToRevoke) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showAddMcpModal, mcpTokenToRevoke]);

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMcpToken(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedMcpToken(false), 2000);
  };

  const handleCreateMcpToken = async () => {
    if (!newMcpName.trim()) return;
    setIsPending(true);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMcpName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ERR_UNKNOWN');
      }
      const data = await res.json();
      setGeneratedMcpToken({ token: data.token, name: data.name });
      showToast(t('mcpCreatedSuccess'));

      const tokensRes = await fetch('/api/mcp/tokens');
      if (tokensRes.ok) {
        setMcpTokens(await tokensRes.json());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tErrors(translateError(msg)) || t('mcpCreateFailed'), 'error');
    } finally {
      setIsPending(false);
    }
  };

  const handleRevokeMcpToken = async (id: string) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ERR_UNKNOWN');
      }
      setMcpTokens((prev) => prev.filter((t) => t.id !== id));
      showToast(t('mcpRevokedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tErrors(translateError(msg)) || t('mcpRevokeFailed'), 'error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Body>
          <Card.Title icon={<Bot className="h-5 w-5 text-primary" />}>
            {t('mcpTitle')}
          </Card.Title>
          <p className="text-xs text-base-content/60 mb-4">{t('mcpDesc')}</p>

          {mcpTokens.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">
                {t('mcpActiveTokens')}
              </h3>
              <div className="space-y-2">
                {mcpTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{token.name}</p>
                        <p className="text-xs text-base-content/40">
                          {token.lastUsedAt
                            ? t('mcpLastUsed', {
                                date: format.dateTime(new Date(token.lastUsedAt), {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                }),
                              })
                            : t('mcpNeverUsed')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setMcpTokenToRevoke(token)}
                      disabled={isPending}
                      variant="ghost"
                      size="xs"
                      className="text-error gap-1"
                      title={t('mcpRevokeBtn')}
                      aria-label={`${t('mcpRevokeBtn')} - ${token.name}`}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {mcpTokens.length === 0 && (
            <p className="text-sm text-base-content/40 text-center py-4 border border-dashed border-base-300 rounded-lg mb-4">
              {t('mcpNoTokens')}
            </p>
          )}

          <div>
            <Button
              onClick={() => {
                setGeneratedMcpToken(null);
                setNewMcpName('');
                setShowAddMcpModal(true);
              }}
              variant="outline-primary"
              size="sm"
              disabled={isPending}
              icon={<Plus className="h-4 w-4" />}
            >
              {t('mcpCreateBtn')}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Generate MCP Token Modal */}
      {showAddMcpModal && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="mcp-modal-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="mcp-modal-title" className="font-bold text-lg text-primary flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {generatedMcpToken ? t('mcpCreatedTitle') : t('mcpCreateBtn')}
            </h3>

            <div className="py-4 space-y-4">
              {!generatedMcpToken ? (
                <Input
                  id="new-mcp-name"
                  label={t('mcpNameLabel')}
                  type="text"
                  placeholder={t('mcpNamePlaceholder')}
                  value={newMcpName}
                  onChange={(e) => setNewMcpName(e.target.value)}
                  disabled={isPending}
                  autoFocus
                />
              ) : (
                <div className="space-y-3">
                  <div className="alert alert-success text-xs gap-2">
                    <span>{t('mcpCreatedDesc')}</span>
                  </div>

                  <div className="form-control w-full">
                    <span className="label-text font-semibold text-base-content/75 mb-1">
                      {t('mcpTokenLabel')}
                    </span>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={generatedMcpToken.token}
                        className="font-mono font-bold text-center w-full text-sm bg-base-200"
                      />
                      <Button
                        type="button"
                        onClick={() => handleCopyToken(generatedMcpToken.token)}
                        className="btn-square px-0 shrink-0"
                        title={copiedMcpToken ? tCommon('copiedSuccess') : tCommon('copy')}
                        aria-label={copiedMcpToken ? tCommon('copiedSuccess') : tCommon('copy')}
                      >
                        {copiedMcpToken ? (
                          <>
                            <Check className="h-4 w-4 text-success" />
                            <span className="sr-only">{tCommon('copiedSuccess')}</span>
                          </>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-base-content/60 leading-relaxed pt-2">
                    {t('mcpInstruction')}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-action">
              {!generatedMcpToken ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddMcpModal(false);
                      setNewMcpName('');
                    }}
                    disabled={isPending}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateMcpToken}
                    loading={isPending}
                    disabled={!newMcpName.trim()}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    {t('mcpCreateBtn')}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setShowAddMcpModal(false);
                    setGeneratedMcpToken(null);
                    setNewMcpName('');
                  }}
                >
                  {tCommon('close')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {mcpTokenToRevoke && (
        <div className="modal modal-open z-50" role="dialog" aria-modal="true" aria-labelledby="revoke-mcp-title">
          <div className="modal-box border border-base-200 shadow-2xl bg-base-100 max-w-md">
            <h3 id="revoke-mcp-title" className="font-bold text-lg text-error flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('mcpRevokeConfirmTitle')}
            </h3>
            <p className="py-4 text-base-content/80 text-sm">
              {t('mcpRevokeConfirmDesc', { name: mcpTokenToRevoke.name })}
            </p>
            <div className="modal-action">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMcpTokenToRevoke(null)}
                disabled={isPending}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="error"
                size="sm"
                loading={isPending}
                onClick={async () => {
                  await handleRevokeMcpToken(mcpTokenToRevoke.id);
                  setMcpTokenToRevoke(null);
                }}
              >
                {t('mcpRevokeConfirmBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
