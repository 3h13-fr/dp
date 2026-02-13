'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, setToken } from '@/lib/api';

type SignupFormProps = {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  redirectParam?: string | null;
};

export function SignupForm({
  onSuccess,
  onSwitchToLogin,
  redirectParam = null,
}: SignupFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('signup');
  const tErrors = useTranslations('errors');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectAfterSignup = (role: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(tErrors('passwordTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(firstName.trim() ? { firstName: firstName.trim() } : undefined),
          ...(lastName.trim() ? { lastName: lastName.trim() } : undefined),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? (res.status === 409 ? t('emailAlreadyRegistered') : tErrors('generic')));
        setSubmitting(false);
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
        redirectAfterSignup(role);
      } else {
        setError(tErrors('noToken'));
      }
    } catch {
      setError(tErrors('generic'));
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold">{t('title')}</h2>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder={t('confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <input
          type="text"
          placeholder={t('firstNamePlaceholder')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          autoComplete="given-name"
        />
        <input
          type="text"
          placeholder={t('lastNamePlaceholder')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          autoComplete="family-name"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>
      {onSwitchToLogin && (
        <p className="mt-6 text-center text-sm text-neutral-600">
          {t('alreadyHaveAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-neutral-800 underline"
          >
            {t('signIn')}
          </button>
        </p>
      )}
    </div>
  );
}
