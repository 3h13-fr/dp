'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, clearToken } from '@/lib/api';

type User = { id: string; email: string; role: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('admin.nav');
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const localePrefix = `/${locale}`;

  useEffect(() => {
    apiFetch('/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        // Only clear token on 401 so transient errors (network, 500) don't log the user out
        if (res.status === 401) clearToken();
        return Promise.reject();
      })
      .then(setUser)
      .catch(() => {
        router.replace(`${localePrefix}/login?redirect=${encodeURIComponent('/admin')}`);
      })
      .finally(() => setLoading(false));
  }, [router, localePrefix]);

  const isAdmin = user && String(user.role).toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (loading) return;
    if (!user) return; // first useEffect handles redirect to login
    if (!isAdmin) {
      router.replace(`${localePrefix}/login?redirect=${encodeURIComponent('/admin')}`);
    }
  }, [loading, user, isAdmin, router, localePrefix, locale]);

  const handleLogout = () => {
    clearToken();
    router.replace(`${localePrefix}/login`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const mainLinks = [
    { href: '/admin', label: t('dashboard') },
    { href: '/admin/users', label: t('users') },
    { href: '/admin/listings', label: t('listings') },
    { href: '/admin/bookings', label: t('bookings') },
    { href: '/admin/markets', label: t('markets') },
    { href: '/admin/insurance', label: t('insurance') },
    { href: '/admin/categories', label: t('categories') },
    { href: '/admin/kyc', label: t('kyc') },
    { href: '/admin/audit', label: t('audit') },
  ];

  const settingsLinks = [
    { href: '/admin/settings/api-keys', label: t('apiKeys') },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-muted/30 p-4">
        <p className="mb-4 font-semibold">Admin</p>
        <nav className="flex flex-col gap-1">
          {mainLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={`${localePrefix}${href}`}
              className={`rounded px-3 py-2 text-sm ${pathWithoutLocale === href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {label}
            </Link>
          ))}
          <p className="mt-4 mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">{t('settings')}</p>
          {settingsLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={`${localePrefix}${href}`}
              className={`rounded px-3 py-2 text-sm ${pathWithoutLocale === href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
