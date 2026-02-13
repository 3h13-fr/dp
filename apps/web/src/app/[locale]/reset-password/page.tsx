'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

function ResetPasswordForm() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useTranslations('resetPassword');
  const tErrors = useTranslations('errors');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(tErrors('passwordTooShort'));
      return;
    }
    if (!token) {
      setError(t('invalidToken'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? t('invalidToken'));
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('invalidToken'));
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-neutral-600">{t('success')}</p>
        <Link
          href={`/${locale}/login`}
          className="mt-6 inline-block font-medium text-neutral-800 underline"
        >
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-red-600">{t('invalidToken')}</p>
        <Link
          href={`/${locale}/forgot-password`}
          className="mt-6 inline-block font-medium text-neutral-800 underline"
        >
          {t('requestNewLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-neutral-600">{t('subtitle')}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="password"
          placeholder={t('newPasswordPlaceholder')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          minLength={8}
          required
        />
        <input
          type="password"
          placeholder={t('confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          minLength={8}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('resetting') : t('submit')}
        </button>
      </form>
      <Link
        href={`/${locale}/forgot-password`}
        className="mt-6 inline-block text-sm text-neutral-600 underline"
      >
        {t('requestNewLink')}
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-4 py-12">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
