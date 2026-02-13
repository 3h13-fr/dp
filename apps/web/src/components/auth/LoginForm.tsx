'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, setToken } from '@/lib/api';

type Step = 'entry' | 'code';

const RESEND_COOLDOWN_SECONDS = 60;

type LoginFormProps = {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSwitchToSignup?: () => void;
  showDemoLogin?: boolean;
  redirectParam?: string | null;
};

export function LoginForm({
  onSuccess,
  onForgotPassword,
  onSwitchToSignup,
  showDemoLogin = false,
  redirectParam = null,
}: LoginFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('login');
  const tAuthModal = useTranslations('authModal');
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

  const target = channel === 'email' ? email : phone;
  const canSend = channel === 'email' ? email.trim().length > 0 : phone.trim().length > 0;

  const redirectAfterLogin = (role: string) => {
    const path =
      role === 'ADMIN'
        ? '/admin'
        : role === 'HOST'
          ? '/host'
          : redirectParam
            ? (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`)
            : '/';
    router.push(`/${locale}${path}`);
    router.refresh();
    onSuccess?.();
  };

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
        let role = data.role != null ? String(data.role).toUpperCase() : '';
        if (!role) {
          try {
            const meRes = await apiFetch('/auth/me');
            if (meRes.ok) {
              const me = await meRes.json();
              role = me?.role != null ? String(me.role).toUpperCase() : '';
              if (me?.role) localStorage.setItem('user_role', me.role);
            }
          } catch {
            /* ignore */
          }
        }
        redirectAfterLogin(role);
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
        let role = data.role != null ? String(data.role).toUpperCase() : '';
        if (!role) {
          try {
            const meRes = await apiFetch('/auth/me');
            if (meRes.ok) {
              const me = await meRes.json();
              role = me?.role != null ? String(me.role).toUpperCase() : '';
              if (me?.role) localStorage.setItem('user_role', me.role);
            }
          } catch {
            /* ignore */
          }
        }
        redirectAfterLogin(role);
      } else {
        setDemoError(tErrors('noToken'));
      }
    } catch {
      setDemoError(t('apiUnreachable'));
    }
    setDemoSubmitting(false);
  };

  const resendSecondsLeft = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

  if (step === 'code') {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => {
            setStep('entry');
            setError('');
            setCode('');
          }}
          className="mb-4 self-start text-sm text-neutral-500 underline hover:text-neutral-700"
        >
          ← {t('changeEmailPhone')}
        </button>
        <h2 className="text-xl font-bold">{t('enterCode')}</h2>
        <p className="mt-2 text-sm text-neutral-500">
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
            className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em]"
            maxLength={6}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
          >
            {verifying ? t('verifying') : t('verify')}
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-800">{t('noCodeReceived')}</p>
          <p className="mt-1 text-sm text-neutral-500">{t('noCodeHint')}</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendSecondsLeft > 0 || sending}
            className="mt-3 text-sm font-medium text-neutral-800 underline disabled:opacity-50"
          >
            {resendSecondsLeft > 0 ? t('resendIn', { seconds: resendSecondsLeft }) : t('resendCode')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold" data-testid="login-title">
        {t('titleUnified')}
      </h2>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white py-3 text-neutral-500"
        >
          <span className="text-lg">🍎</span>
          {t('continueWithApple')}
        </button>
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white py-3 text-neutral-500"
        >
          <span className="text-lg">G</span>
          {t('continueWithGoogle')}
        </button>
        <p className="text-center text-xs text-neutral-500">{t('comingSoon')}</p>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-sm text-neutral-500">ou</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <p className="text-sm font-medium text-neutral-800">{t('continueWithCode')}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setChannel('email')}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            channel === 'email'
              ? 'border-neutral-800 bg-neutral-100 text-neutral-800'
              : 'border-neutral-200 bg-white text-neutral-500'
          }`}
        >
          {t('email')}
        </button>
        <button
          type="button"
          disabled
          title={t('comingSoon')}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-400"
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
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
            required
          />
        ) : (
          <input
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSend || sending}
          className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
        >
          {sending ? t('sending') : t('sendCode')}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-500">{t('entryHint')}</p>

      {onForgotPassword && (
        <p className="mt-4 text-center text-sm text-neutral-600">
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-medium text-neutral-800 underline"
          >
            {t('forgotPassword')}
          </button>
        </p>
      )}

      {onSwitchToSignup && (
        <p className="mt-4 text-center text-sm text-neutral-600">
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-neutral-800 underline"
          >
            {tAuthModal('createAccount')}
          </button>
        </p>
      )}

      {showDemoLogin && (
        <div className="mt-10 border-t border-neutral-200 pt-8" data-testid="demo-login-section">
          <p className="mb-3 text-sm font-medium text-neutral-500">Demo login (E2E / tests)</p>
          <form onSubmit={handleDemoLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={demoPassword}
              onChange={(e) => setDemoPassword(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
              required
            />
            {onForgotPassword && (
              <p className="text-sm">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="font-medium text-neutral-800 underline"
                >
                  {t('forgotPassword')}
                </button>
              </p>
            )}
            {demoError && <p className="text-sm text-red-600">{demoError}</p>}
            <button
              type="submit"
              disabled={demoSubmitting}
              className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
            >
              {demoSubmitting ? t('verifying') : t('signIn')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
