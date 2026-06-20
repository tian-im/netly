'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startRegistration } from '@simplewebauthn/browser';
import { KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useLocaleContext } from '../providers';
import { translateError } from '@/lib/translateError';
import { buildLoginUrl, buildDashboardUrl, buildDocsUrl } from '@/lib/links';
import { Button, Input, Select, Card } from '@/app/components/ui';
import Link from 'next/link';

function getDefaultDeviceName(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'My Mac';
  if (/Windows/i.test(ua)) return 'My PC';
  if (/iPhone|iPad/i.test(ua)) return 'My iPhone';
  if (/Android/i.test(ua)) return 'My Android';
  if (/Linux/i.test(ua)) return 'My Linux Device';
  return 'My Device';
}

export default function SetupPage() {
  const router = useRouter();
  const t = useTranslations('passkey.setup');
  const tNav = useTranslations('nav');
  const tErrors = useTranslations('errors');
  const { locale, setLocale } = useLocaleContext();

  const [deviceName, setDeviceName] = useState(getDefaultDeviceName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hasSetupToken = params.has('setupToken');

        const res = await fetch('/api/auth/credentials');
        if (res.ok) {
          const creds = await res.json();
          if (creds.length > 0 && !hasSetupToken) {
            router.replace(buildLoginUrl());
            return;
          }
        }
      } catch {
      } finally {
        setCheckingExisting(false);
      }
    })();
  }, [router]);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setError(tErrors('ERR_DEVICE_NAME_REQUIRED'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const beginRes = await fetch('/api/auth/register/begin', { method: 'POST' });
      if (!beginRes.ok) {
        const data = await beginRes.json();
        throw new Error(data.error);
      }

      const options = await beginRes.json();
      const { state, ...regOptions } = options;

      const regResponse = await startRegistration(regOptions);

      const completeRes = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, deviceName: deviceName.trim(), ...regResponse }),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleRegister();
    }
  };

  if (checkingExisting) {
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
              onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
              size="xs"
              className="!w-24"
              aria-label="Language Selector"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
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
            onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
            size="xs"
            className="!w-24"
            aria-label="Language Selector"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </Select>
        </div>

        <Card.Body className="items-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-base-content">
            {t('title')}
          </h1>
          <p className="text-sm text-base-content/60 mt-1 mb-6">
            {t('subtitle')}
          </p>

          {error && (
            <div className="alert alert-error shadow-lg mb-4 text-sm w-full">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="w-full mb-4 text-left">
            <Input
              id="device-name"
              type="text"
              label={t('deviceName')}
              placeholder={t('deviceNamePlaceholder')}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              helperText={t('deviceNameHelp')}
              autoFocus
            />
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading || !deviceName.trim()}
            size="lg"
            className="w-full"
            loading={loading}
            icon={<KeyRound className="h-5 w-5" />}
          >
            {loading ? t('registering') : t('createBtn')}
          </Button>

          <div className="pt-4 border-t border-base-300 w-full text-center mt-4">
            <Link href={buildDocsUrl()} className="text-primary hover:underline font-medium text-xs">
              {tNav('docs')}
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
