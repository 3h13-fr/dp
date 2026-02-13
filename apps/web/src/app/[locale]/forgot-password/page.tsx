'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError('Cannot reach the API. Please try again later.');
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

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-neutral-600">{t('subtitle')}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('sending') : t('submit')}
        </button>
      </form>
      <Link
        href={`/${locale}/login`}
        className="mt-6 inline-block text-sm font-medium text-neutral-600 underline"
      >
        {t('backToLogin')}
      </Link>
    </div>
  );
}
