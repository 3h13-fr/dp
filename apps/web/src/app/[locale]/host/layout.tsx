'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, clearToken } from '@/lib/api';
import { SparkIcon } from '@/components/icons/SparkIcon';

const VIEW_MODE_KEY = 'view_mode';

type User = { id: string; email: string; role: string };

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const localePrefix = `/${locale}`;

  useEffect(() => {
    apiFetch('/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace(`${localePrefix}/login?redirect=/host`);
      })
      .finally(() => setLoading(false));
  }, [router, localePrefix]);

  useEffect(() => {
    if (!loading && user && user.role !== 'HOST') {
      router.replace(localePrefix);
    }
  }, [loading, user, router, localePrefix]);

  const switchToClient = () => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, 'client');
    } catch {
      /* ignore */
    }
    router.push(localePrefix);
    router.refresh();
  };

  const handleLogout = () => {
    clearToken();
    try {
      localStorage.setItem(VIEW_MODE_KEY, 'client');
      localStorage.removeItem('user_role');
    } catch {
      /* ignore */
    }
    router.replace(`${localePrefix}/login`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== 'HOST') {
    return null;
  }

  const navLinkClass = (href: string) =>
    pathWithoutLocale === href
      ? 'text-primary font-medium'
      : 'text-muted-foreground hover:text-foreground';

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href={`${localePrefix}/host`}
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
            aria-label="DrivePark Partenaire"
          >
            <SparkIcon className="h-6 w-6" />
            <span className="hidden sm:inline">DrivePark</span>
            <span className="hidden text-sm font-normal text-muted-foreground sm:inline">· Partenaire</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4" aria-label="Host navigation">
            <Link
              href={`${localePrefix}/host`}
              className={`rounded-lg px-3 py-2 text-sm ${navLinkClass('/host')}`}
            >
              {t('dashboard')}
            </Link>
            <Link
              href={`${localePrefix}/host/bookings`}
              className={`rounded-lg px-3 py-2 text-sm ${navLinkClass('/host/bookings')}`}
            >
              {t('bookings')}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={switchToClient}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t('viewSite')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
