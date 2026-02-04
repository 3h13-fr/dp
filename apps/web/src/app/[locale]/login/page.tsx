'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, setToken } from '@/lib/api';

type Step = 'entry' | 'code';

const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const t = useTranslations('login');
  const tErrors = useTranslations('errors');

  const [step, setStep] = useState<Step>('entry');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendAt, setResendAt] = useState<number>(0);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [demoError, setDemoError] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  const showDemoLogin = searchParams.get('demo') === '1';
  const target = channel === 'email' ? email : phone;
  const canSend = channel === 'email' ? email.trim().length > 0 : phone.trim().length > 0;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSend) {
      setError(tErrors('emailOrPhoneRequired'));
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({
          ...(channel === 'email' ? { email: email.trim() } : { phone: phone.trim() }),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? tErrors('generic'));
        setSending(false);
        return;
      }
      setStep('code');
      setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setCode('');
    } catch {
      setError(t('apiUnreachable'));
    }
    setSending(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const res = await apiFetch('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          ...(channel === 'email' ? { email: email.trim() } : { phone: phone.trim() }),
          code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? tErrors('invalidOrExpiredCode'));
        setVerifying(false);
        return;
      }
      if (data.access_token) {
        setToken(data.access_token);
        if (data.role) {
          try {
            localStorage.setItem('user_role', data.role);
          } catch {
            /* ignore */
          }
        }
        const path = redirectParam
          ? (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`)
          : data.role === 'ADMIN'
            ? '/admin'
            : data.role === 'HOST'
              ? '/host'
              : '/';
        router.push(`/${locale}${path}`);
        router.refresh();
      } else {
        setError(tErrors('noToken'));
      }
    } catch {
      setError(t('apiUnreachable'));
    }
    setVerifying(false);
  };

  const handleResend = async () => {
    if (resendAt > Date.now()) return;
    setError('');
    setSending(true);
    try {
      const res = await apiFetch('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({
          ...(channel === 'email' ? { email: email.trim() } : { phone: phone.trim() }),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? tErrors('waitBeforeResend'));
      } else {
        setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      }
    } catch {
      setError(t('apiUnreachable'));
    }
    setSending(false);
  };

  const resendSecondsLeft = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError('');
    setDemoSubmitting(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail.trim(), password: demoPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDemoError(data.message ?? tErrors('loginFailed'));
        setDemoSubmitting(false);
        return;
      }
      if (data.access_token) {
        setToken(data.access_token);
        if (data.role) {
          try {
            localStorage.setItem('user_role', data.role);
          } catch {
            /* ignore */
          }
        }
        const path = redirectParam
          ? (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`)
          : data.role === 'ADMIN'
            ? '/admin'
            : data.role === 'HOST'
              ? '/host'
              : '/';
        router.push(`/${locale}${path}`);
        router.refresh();
      } else {
        setDemoError(tErrors('noToken'));
      }
    } catch {
      setDemoError(t('apiUnreachable'));
    }
    setDemoSubmitting(false);
  };

  if (step === 'code') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
        <button
          type="button"
          onClick={() => { setStep('entry'); setError(''); setCode(''); }}
          className="mb-4 self-start text-sm text-muted-foreground underline hover:text-foreground"
        >
          ← {t('changeEmailPhone')}
        </button>
        <h1 className="text-2xl font-bold">{t('enterCode')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('codeSent', { target: channel === 'email' ? email : phone })}
        </p>
        <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="rounded-lg border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em]"
            maxLength={6}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            className="rounded-lg bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            {verifying ? t('verifying') : t('verify')}
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">{t('noCodeReceived')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('noCodeHint')}</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendSecondsLeft > 0 || sending}
            className="mt-3 text-sm font-medium text-primary underline disabled:opacity-50"
          >
            {resendSecondsLeft > 0 ? t('resendIn', { seconds: resendSecondsLeft }) : t('resendCode')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold" data-testid="login-title">{t('title')}</h1>

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-foreground opacity-60"
        >
          <span className="text-lg">🍎</span>
          {t('continueWithApple')}
        </button>
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-foreground opacity-60"
        >
          <span className="text-lg">G</span>
          {t('continueWithGoogle')}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t('comingSoon')}</p>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="text-sm font-medium text-foreground">{t('continueWithCode')}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setChannel('email')}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${channel === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
        >
          {t('email')}
        </button>
        <button
          type="button"
          disabled
          title={t('comingSoon')}
          className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground opacity-70"
        >
          {t('phone')} ({t('comingSoon')})
        </button>
      </div>

      <form onSubmit={handleSendCode} className="mt-4 flex flex-col gap-4">
        {channel === 'email' ? (
          <input
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2"
            required
          />
        ) : (
          <input
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSend || sending}
          className="rounded-lg bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? t('sending') : t('sendCode')}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('entryHint')}
      </p>

      {showDemoLogin && (
        <div className="mt-10 border-t border-border pt-8" data-testid="demo-login-section">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Demo login (E2E / tests)</p>
          <form onSubmit={handleDemoLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={demoPassword}
              onChange={(e) => setDemoPassword(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2"
              required
            />
            {demoError && <p className="text-sm text-red-600">{demoError}</p>}
            <button
              type="submit"
              disabled={demoSubmitting}
              className="rounded-lg bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {demoSubmitting ? t('verifying') : t('signIn')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
