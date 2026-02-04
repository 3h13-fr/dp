'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const t = useTranslations('login');
  const tErrors = useTranslations('errors');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let res: Response;
    try {
      res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      setError(t('apiUnreachable'));
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message ?? tErrors('loginFailed'));
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
      const role = data.role;
      const path = redirectParam
        ? (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`)
        : role === 'ADMIN'
          ? '/admin'
          : role === 'HOST'
            ? '/host'
            : '/';
      router.push(`/${locale}${path}`);
      router.refresh();
    } else {
      setError(tErrors('noToken'));
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2"
          required
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded-lg bg-primary py-2 font-medium text-primary-foreground">
          {t('signIn')}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('demoHint')}
      </p>
    </div>
  );
}
