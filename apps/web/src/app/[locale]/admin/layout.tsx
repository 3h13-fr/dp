'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { apiFetch, clearToken } from '@/lib/api';

type User = { id: string; email: string; role: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        router.replace(`${localePrefix}/login`);
      })
      .finally(() => setLoading(false));
  }, [router, localePrefix]);

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace(localePrefix);
    }
  }, [loading, user, router, localePrefix]);

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

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/audit', label: 'Audit logs' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-muted/30 p-4">
        <p className="mb-4 font-semibold">Admin</p>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label }) => (
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
