'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { getToken, clearToken } from '@/lib/api';

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    setLoggedIn(!!token);
    try {
      const stored = localStorage.getItem('user_role');
      if (stored) {
        setRole(stored);
      } else if (token) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((user) => {
            if (user?.role) {
              localStorage.setItem('user_role', user.role);
              setRole(user.role);
            }
          })
          .catch(() => {});
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    try {
      localStorage.removeItem('user_role');
    } catch {
      /* ignore */
    }
    setLoggedIn(false);
    setRole(null);
    router.push(`/${locale}`);
    router.refresh();
  };

  const links = [
    { href: '/listings', label: t('listings') },
    { href: '/bookings', label: t('myBookings') },
    { href: '/messages', label: t('messages') },
  ];

  const localePrefix = `/${locale}`;
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={localePrefix} className="text-xl font-semibold text-primary">
          Mobility
        </Link>
        <nav className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={`${localePrefix}${href}`}
              className={clsx(
                'text-sm font-medium transition-colors hover:text-primary',
                pathWithoutLocale === href || pathWithoutLocale.startsWith(href + '/') ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
          {role === 'ADMIN' && (
            <Link
              href={`${localePrefix}/admin`}
              className={clsx(
                'text-sm font-medium transition-colors hover:text-primary',
                pathWithoutLocale.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              Admin
            </Link>
          )}
          {role === 'HOST' && (
            <Link
              href={`${localePrefix}/host`}
              className={clsx(
                'text-sm font-medium transition-colors hover:text-primary',
                pathWithoutLocale.startsWith('/host') ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              Host
            </Link>
          )}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {t('logout')}
            </button>
          ) : (
            <Link
              href={`${localePrefix}/login`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t('account')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
