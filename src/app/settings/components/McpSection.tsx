import { useState, useRef, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { translateError } from '@/lib/translateError';
import { Bot, Trash2, Plus, Copy } from 'lucide-react';
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
  const [isCreatingMcpToken, setIsCreatingMcpToken] = useState(false);
  const [generatedMcpToken, setGeneratedMcpToken] = useState<{ token: string; name: string } | null>(null);
  const [copiedMcpToken, setCopiedMcpToken] = useState(false);
  const [isRevokingMcpId, setIsRevokingMcpId] = useState<string | null>(null);

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMcpToken(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedMcpToken(false), 2000);
  };

  const handleCreateMcpToken = async () => {
    if (!newMcpName.trim()) return;
    setIsCreatingMcpToken(true);
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
      setIsCreatingMcpToken(false);
    }
  };

  const handleRevokeMcpToken = async (id: string) => {
    setIsRevokingMcpId(id);
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
      setIsRevokingMcpId(null);
    }
  };

  return (
    <>
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-6">
          <h2 className="card-title text-lg font-bold text-primary flex items-center gap-2 mb-2">
            <Bot className="h-5 w-5 text-primary" />
            {t('mcpTitle')}
          </h2>
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
                    <button
                      onClick={() => handleRevokeMcpToken(token.id)}
                      disabled={isRevokingMcpId === token.id}
                      className="btn btn-ghost btn-xs text-error gap-1"
                      title={t('mcpRevokeBtn')}
                      aria-label={`${t('mcpRevokeBtn')} - ${token.name}`}
                    >
                      {isRevokingMcpId === token.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
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
            <button
              onClick={() => {
                setGeneratedMcpToken(null);
                setNewMcpName('');
                setShowAddMcpModal(true);
              }}
              className="btn btn-outline btn-primary btn-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('mcpCreateBtn')}
            </button>
          </div>
        </div>
      </div>

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
                <div className="form-control w-full">
                  <label className="label py-1" htmlFor="new-mcp-name">
                    <span className="label-text font-semibold text-base-content/75">
                      {t('mcpNameLabel')}
                    </span>
                  </label>
                  <input
                    id="new-mcp-name"
                    type="text"
                    placeholder={t('mcpNamePlaceholder')}
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    className="input input-bordered w-full"
                    disabled={isCreatingMcpToken}
                    autoFocus
                  />
                </div>
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
                      <input
                        type="text"
                        readOnly
                        value={generatedMcpToken.token}
                        className="input input-bordered font-mono font-bold text-center w-full text-sm bg-base-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyToken(generatedMcpToken.token)}
                        className="btn btn-primary btn-square"
                        title={tCommon('copy')}
                        aria-label={tCommon('copy')}
                      >
                        {copiedMcpToken ? (
                          <span className="text-xs font-bold">{t('copiedSuccess')}</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMcpModal(false);
                      setNewMcpName('');
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={isCreatingMcpToken}
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateMcpToken}
                    className="btn btn-primary btn-sm gap-2"
                    disabled={isCreatingMcpToken || !newMcpName.trim()}
                  >
                    {isCreatingMcpToken ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {t('mcpCreateBtn')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMcpModal(false);
                    setGeneratedMcpToken(null);
                    setNewMcpName('');
                  }}
                  className="btn btn-sm"
                >
                  {tCommon('close')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
