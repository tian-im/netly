'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useLocaleContext } from '../providers';
import { translateError } from '@/lib/translateError';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('passkey.login');
  const tErrors = useTranslations('errors');
  const { locale, setLocale } = useLocaleContext();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [useSetupCodeMode, setUseSetupCodeMode] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [verifyingSetupCode, setVerifyingSetupCode] = useState(false);

  const handleVerifySetupCode = useCallback(async (directToken?: string) => {
    const codeToVerify = (directToken || setupCode).trim();
    if (!codeToVerify) return;
    setVerifyingSetupCode(true);
    setError('');
    try {
      const res = await fetch('/api/auth/setup-token/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: codeToVerify }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ERR_UNKNOWN');
      }
      router.push('/setup?setupToken=1');
    } catch (err: any) {
      setError(tErrors(translateError(err.message)));
    } finally {
      setVerifyingSetupCode(false);
    }
  }, [setupCode, tErrors, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/credentials');
        if (res.ok) {
          const creds = await res.json();
          if (creds.length === 0) {
            router.replace('/setup');
            return;
          }
        }
      } catch {
      } finally {
        setCheckingSetup(false);
      }
    })();

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('setupToken');
    if (tokenParam) {
      setSetupCode(tokenParam);
      setUseSetupCodeMode(true);
      handleVerifySetupCode(tokenParam);
    }
  }, [router, handleVerifySetupCode]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const beginRes = await fetch('/api/auth/login/begin', { method: 'POST' });
      if (!beginRes.ok) {
        const data = await beginRes.json();
        if (beginRes.status === 409 && data.redirect === '/setup') {
          router.push('/setup');
          return;
        }
        throw new Error(data.error);
      }

      const options = await beginRes.json();
      const { state, ...authOptions } = options;

      const authResponse = await startAuthentication(authOptions);

      const completeRes = await fetch('/api/auth/login/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, ...authResponse }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(tErrors(translateError(err.message)));
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="h-full flex items-center justify-center bg-base-300">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-full flex items-center justify-center bg-base-300">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-200 relative">
          <div className="absolute top-4 right-4">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
              className="select select-bordered select-xs"
              aria-label="Language Selector"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div className="card-body items-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-base-content">
              {t('successTitle')}
            </h1>
            <p className="text-sm text-base-content/60 mt-1 mb-6 flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('successDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-base-300">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-200 relative">
        <div className="absolute top-4 right-4">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
            className="select select-bordered select-xs"
            aria-label="Language Selector"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="card-body items-center text-center p-8 w-full">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-base-content">
            Netly Ledger
          </h1>
          <p className="text-sm text-base-content/60 mt-1 mb-6">
            {useSetupCodeMode ? t('enterSetupCodeDesc') : t('subtitle')}
          </p>

          {error && (
            <div className="alert alert-error shadow-lg mb-4 text-sm w-full text-left">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {useSetupCodeMode ? (
            <div className="w-full space-y-4">
              <div className="form-control w-full">
                <input
                  type="text"
                  placeholder={t('setupCodePlaceholder')}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && !verifyingSetupCode && handleVerifySetupCode()}
                  className="input input-bordered font-mono font-bold text-center tracking-wider text-lg w-full"
                  disabled={verifyingSetupCode}
                  autoFocus
                />
              </div>

              <button
                onClick={() => handleVerifySetupCode()}
                disabled={verifyingSetupCode || !setupCode.trim()}
                className="btn btn-primary btn-lg w-full gap-2"
              >
                {verifyingSetupCode ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
                {verifyingSetupCode ? t('verifyingSetupCode') : t('submitSetupCodeBtn')}
              </button>

              <button
                onClick={() => {
                  setUseSetupCodeMode(false);
                  setError('');
                  setSetupCode('');
                }}
                disabled={verifyingSetupCode}
                className="btn btn-link btn-sm text-base-content/60 no-underline hover:underline"
              >
                {t('backToPasskey')}
              </button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn btn-primary btn-lg w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
                {loading ? t('authenticating') : t('signInBtn')}
              </button>

              <div className="text-xs text-base-content/50 pt-2">
                <span>{t('cantUsePasskey')} </span>
                <button
                  onClick={() => {
                    setUseSetupCodeMode(true);
                    setError('');
                  }}
                  className="link link-primary font-semibold"
                >
                  {t('useSetupCode')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
