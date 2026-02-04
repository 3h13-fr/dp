'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { apiFetch, clearToken } from '@/lib/api';

type User = { id: string; email: string; role: string };

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
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

  const handleLogout = () => {
    clearToken();
    try {
      localStorage.removeItem('user_role');
    } catch {
      /* ignore */
    }
    router.replace(`${localePrefix}/login`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== 'HOST') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <nav className="flex gap-4">
            <Link
              href={`${localePrefix}/host`}
              className={`text-sm font-medium ${pathWithoutLocale === '/host' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              My listings
            </Link>
            <Link
              href={`${localePrefix}/host/bookings`}
              className={`text-sm font-medium ${pathWithoutLocale === '/host/bookings' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              Incoming bookings
            </Link>
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </div>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
