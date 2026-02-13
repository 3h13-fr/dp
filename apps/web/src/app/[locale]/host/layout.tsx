'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, clearToken } from '@/lib/api';
import Image from 'next/image';
import { HostBottomNav } from '@/components/host/HostBottomNav';

const VIEW_MODE_KEY = 'view_mode';

type User = { id: string; email: string; role: string };

function HostNavIcon({ name }: { name: 'stats' | 'list' | 'car' | 'chat' | 'key' | 'logout' }) {
  const icons = {
    stats: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    list: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    car: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-3 4h3m-6 0H8m0 0v-2m0 2v2m0-2h2" />
      </svg>
    ),
    chat: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    key: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    logout: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  };
  return icons[name];
}

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const localePrefix = `/${locale}`;

  useEffect(() => {
    apiFetch('/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 401) clearToken();
        return Promise.reject();
      })
      .then(setUser)
      .catch(() => {
        router.replace(`${localePrefix}/login?redirect=${encodeURIComponent('/host')}`);
      })
      .finally(() => setLoading(false));
  }, [router, localePrefix]);

  useEffect(() => {
    if (!loading && user && user.role !== 'HOST') {
      router.replace(localePrefix);
    }
  }, [loading, user, router, localePrefix]);

  const switchToClient = () => {
    setMenuOpen(false);
    try {
      localStorage.setItem(VIEW_MODE_KEY, 'client');
    } catch {
      /* ignore */
    }
    router.push(localePrefix);
    router.refresh();
  };

  const handleLogout = () => {
    setMenuOpen(false);
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

  const menuItemClass =
    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50';
  const menuDivider = <div className="border-t border-neutral-100" />;

  const dropdownContent = (
    <div className="min-w-[240px] py-1">
      <Link
        href={`${localePrefix}/host`}
        className={menuItemClass}
        onClick={() => setMenuOpen(false)}
      >
        <HostNavIcon name="stats" />
        {t('dashboard')}
      </Link>
      <Link
        href={`${localePrefix}/host/listings`}
        className={menuItemClass}
        onClick={() => setMenuOpen(false)}
      >
        <HostNavIcon name="list" />
        {t('listings')}
      </Link>
      <Link
        href={`${localePrefix}/host/bookings`}
        className={menuItemClass}
        onClick={() => setMenuOpen(false)}
      >
        <HostNavIcon name="car" />
        {t('bookings')}
      </Link>
      <Link
        href={`${localePrefix}/host/messages`}
        className={menuItemClass}
        onClick={() => setMenuOpen(false)}
      >
        <HostNavIcon name="chat" />
        {t('messages')}
      </Link>
      {menuDivider}
      <Link
        href={localePrefix}
        className={menuItemClass}
        onClick={() => {
          setMenuOpen(false);
          try {
            localStorage.setItem(VIEW_MODE_KEY, 'client');
          } catch {
            /* ignore */
          }
        }}
      >
        <HostNavIcon name="key" />
        {t('viewSite')}
      </Link>
      {menuDivider}
      <button type="button" className={menuItemClass} onClick={handleLogout}>
        <HostNavIcon name="logout" />
        {t('logout')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 border-b border-border bg-white" data-testid="host-header">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href={`${localePrefix}/host`}
            className="flex items-center gap-2 text-lg font-semibold text-black"
            aria-label="DrivePark Partenaire"
          >
            <Image 
              src="https://drivepark.net/storage/2024/06/26/group-3-2-1719388913.png" 
              alt="DrivePark" 
              width={24} 
              height={24} 
              className="h-6 w-6 shrink-0" 
              aria-hidden 
            />
            <span className="hidden sm:inline">DrivePark</span>
            <span className="hidden text-sm font-normal text-neutral-500 sm:inline">· Partenaire</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={localePrefix}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-black md:inline-block"
              onClick={(e) => {
                try {
                  localStorage.setItem(VIEW_MODE_KEY, 'client');
                } catch {
                  /* ignore */
                }
              }}
            >
              {t('viewSite')}
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-2 text-neutral-700 hover:bg-neutral-100"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label={t('menu')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                    {dropdownContent}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6 pb-20 md:pb-6">{children}</main>
      <HostBottomNav />
    </div>
  );
}
