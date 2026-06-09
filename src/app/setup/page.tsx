'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startRegistration } from '@simplewebauthn/browser';
import { KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useLocaleContext } from '../providers';
import { translateError } from '@/lib/translateError';

export default function SetupPage() {
  const router = useRouter();
  const t = useTranslations('passkey.setup');
  const tErrors = useTranslations('errors');
  const { locale, setLocale } = useLocaleContext();

  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hasSetupToken = params.has('setupToken');

        const res = await fetch('/api/auth/credentials');
        if (res.ok) {
          const creds = await res.json();
          if (creds.length > 0 && !hasSetupToken) {
            router.replace('/login');
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

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(tErrors(translateError(err.message)));
    } finally {
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

          <div className="form-control w-full mb-4">
            <label className="label" htmlFor="device-name">
              <span className="label-text font-semibold text-base-content/75">
                {t('deviceName')}
              </span>
            </label>
            <input
              id="device-name"
              type="text"
              placeholder={t('deviceNamePlaceholder')}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input input-bordered w-full"
              disabled={loading}
              autoFocus
            />
            <label className="label">
              <span className="label-text-alt text-base-content/40">
                {t('deviceNameHelp')}
              </span>
            </label>
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || !deviceName.trim()}
            className="btn btn-primary btn-lg w-full gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
            {loading ? t('registering') : t('createBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
