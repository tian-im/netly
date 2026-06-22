'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useLocaleContext } from '../providers';
import { translateError } from '@/lib/translateError';
import { buildSetupUrl, buildDashboardUrl, buildDocsUrl } from '@/lib/links';
import { Button, Input, Select, Card } from '@/app/components/ui';
import type { Locale } from '@/lib/locale';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('passkey.login');
  const tNav = useTranslations('nav');
  const tSettings = useTranslations('settings');
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
      router.push(buildSetupUrl(true));
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
            router.replace(buildSetupUrl());
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
          router.push(buildSetupUrl());
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
        router.push(buildDashboardUrl());
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
        <Card shadow="2xl" className="w-full max-w-md relative">
          <div className="absolute top-4 right-4 z-10">
            <Select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              size="xs"
              className="!w-32"
              aria-label="Language Selector"
            >
              <option value="en">{tSettings('languages.en')}</option>
              <option value="zh">{tSettings('languages.zh')}</option>
              <option value="zh-TW">{tSettings('languages.zh-TW')}</option>
              <option value="ja">{tSettings('languages.ja')}</option>
              <option value="ko">{tSettings('languages.ko')}</option>
            </Select>
          </div>

          <Card.Body className="items-center text-center p-8">
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
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-base-300">
      <Card shadow="2xl" className="w-full max-w-md relative">
        <div className="absolute top-4 right-4 z-10">
          <Select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            size="xs"
            className="!w-32"
            aria-label="Language Selector"
          >
            <option value="en">{tSettings('languages.en')}</option>
            <option value="zh">{tSettings('languages.zh')}</option>
            <option value="zh-TW">{tSettings('languages.zh-TW')}</option>
            <option value="ja">{tSettings('languages.ja')}</option>
            <option value="ko">{tSettings('languages.ko')}</option>
          </Select>
        </div>

        <Card.Body className="items-center text-center p-8 w-full">
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
              <Input
                type="text"
                placeholder={t('setupCodePlaceholder')}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && !verifyingSetupCode && handleVerifySetupCode()}
                className="font-mono font-bold text-center tracking-wider text-lg w-full"
                disabled={verifyingSetupCode}
                autoFocus
              />

              <Button
                onClick={() => handleVerifySetupCode()}
                disabled={verifyingSetupCode || !setupCode.trim()}
                size="lg"
                className="w-full"
                loading={verifyingSetupCode}
                icon={<KeyRound className="h-5 w-5" />}
              >
                {verifyingSetupCode ? t('verifyingSetupCode') : t('submitSetupCodeBtn')}
              </Button>

              <Button
                onClick={() => {
                  setUseSetupCodeMode(false);
                  setError('');
                  setSetupCode('');
                }}
                disabled={verifyingSetupCode}
                variant="link"
                size="sm"
                className="text-base-content/60 no-underline hover:underline"
              >
                {t('backToPasskey')}
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <Button
                onClick={handleLogin}
                size="lg"
                className="w-full"
                loading={loading}
                icon={<KeyRound className="h-5 w-5" />}
              >
                {loading ? t('authenticating') : t('signInBtn')}
              </Button>

              <div className="text-xs text-base-content/50 pt-2 flex flex-col items-center gap-2">
                <div>
                  <span>{t('cantUsePasskey')} </span>
                  <Button
                    onClick={() => {
                      setUseSetupCodeMode(true);
                      setError('');
                    }}
                    variant="link"
                    className="font-semibold"
                  >
                    {t('useSetupCode')}
                  </Button>
                </div>
                <div className="pt-2 border-t border-base-300 w-full text-center">
                  <Link href={buildDocsUrl()} className="text-primary hover:underline font-medium">
                    {tNav('docs')}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
