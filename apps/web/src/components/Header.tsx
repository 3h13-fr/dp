'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { getToken, clearToken } from '@/lib/api';
import { SparkIcon } from '@/components/icons/SparkIcon';
import { HeaderSearchBar } from '@/components/HeaderSearchBar';
import { SearchBottomSheet } from '@/components/SearchBottomSheet';

function NavMenuIcon({ name }: { name: 'key' | 'help' | 'headset' | 'lifebuoy' | 'login' | 'user' | 'heart' | 'car' | 'bell' | 'chat' | 'logout' }) {
  const icons = {
    key: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    help: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headset: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 7a7 7 0 01-7-7V7a7 7 0 0114 0v5a7 7 0 01-7 7z" />
      </svg>
    ),
    lifebuoy: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    login: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    user: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    heart: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    car: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-3 4h3m-6 0H8m0 0v-2m0 2v2m0-2h2" />
      </svg>
    ),
    bell: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    chat: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

export function Header() {
  const t = useTranslations('nav');
  const tSearch = useTranslations('headerSearch');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/d4d80e1e-130a-4236-9b97-782fd171848c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Header.tsx',message:'Header mounted',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  }, [pathname]);
  // #endregion

  useEffect(() => {
    const token = getToken();
    setLoggedIn(!!token);
    if (!token) {
      setRole(null);
      return;
    }
    const stored = localStorage.getItem('user_role');
    if (stored) setRole(stored);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.role) {
          localStorage.setItem('user_role', user.role);
          setRole(user.role);
        } else if (!stored) setRole(null);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeoutId));
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    try { localStorage.removeItem('user_role'); } catch { /* ignore */ }
    setLoggedIn(false);
    setRole(null);
    setMenuOpen(false);
    router.push(`/${locale}`);
    router.refresh();
  };

  const tabLinks = [
    { href: '/location', label: t('vehicles'), testId: 'nav-link-location' },
    { href: '/experience', label: t('experiences'), testId: 'nav-link-experience' },
    { href: '/ride', label: t('ride'), testId: 'nav-link-ride' },
  ];
  const localePrefix = `/${locale}`;
  const isActive = (href: string) =>
    pathWithoutLocale === href || pathWithoutLocale.startsWith(href + '/');

  const menuItemClass = 'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50';
  const menuDivider = <div className="border-t border-neutral-100" />;

  const dropdownContent = (
    <div className="min-w-[240px] py-1">
      {isLoggedIn ? (
        <>
          <Link href={`${localePrefix}/profil`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
            <NavMenuIcon name="user" />
            {t('profile')}
          </Link>
          {menuDivider}
          <Link href={`${localePrefix}`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
            <NavMenuIcon name="heart" />
            {t('favorites')}
          </Link>
          <Link href={`${localePrefix}/bookings`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
            <NavMenuIcon name="car" />
            {t('reservations')}
          </Link>
          <Link href={`${localePrefix}/messages`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
            <NavMenuIcon name="chat" />
            {t('messages')}
          </Link>
          {menuDivider}
        </>
      ) : null}
      <Link
        href={`${localePrefix}/host`}
        className={menuItemClass}
        onClick={() => {
          setMenuOpen(false);
          try {
            localStorage.setItem('view_mode', 'host');
          } catch {
            /* ignore */
          }
        }}
      >
        <NavMenuIcon name="key" />
        {role === 'HOST' ? t('partnerDashboard') : t('rentMyVehicles')}
      </Link>
      {menuDivider}
      <Link href={`${localePrefix}/profil#assistance`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
        <NavMenuIcon name="help" />
        {t('helpCenter')}
      </Link>
      <Link href={`${localePrefix}/profil#assistance`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
        <NavMenuIcon name="headset" />
        {t('assistanceDrivePark')}
      </Link>
      <Link href={`${localePrefix}/profil#how`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
        <NavMenuIcon name="lifebuoy" />
        {t('howItWorks')}
      </Link>
      {menuDivider}
      {isLoggedIn ? (
        <button type="button" className={menuItemClass} onClick={() => { setMenuOpen(false); handleLogout(); }}>
          <NavMenuIcon name="logout" />
          {t('logout')}
        </button>
      ) : (
        <Link href={`${localePrefix}/login`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
          <NavMenuIcon name="login" />
          {t('account')}
        </Link>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white" data-testid="app-header">
      {/* Row 1: Logo, nav tabs, user actions */}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={localePrefix} className="flex items-center gap-2 text-lg font-semibold text-black" aria-label="DrivePark" data-testid="header-logo">
          <SparkIcon className="h-6 w-6 shrink-0 text-black" aria-hidden />
          <span>DrivePark</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-0 md:flex" role="tablist" aria-label={t('vehicles')}>
          {tabLinks.map(({ href, label, testId }) => (
            <Link
              key={href}
              href={`${localePrefix}${href}`}
              data-testid={testId}
              className={clsx(
                'rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
                isActive(href) ? 'bg-neutral-100 text-black' : 'text-neutral-600 hover:bg-neutral-50 hover:text-black',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href={`${localePrefix}/host`} className="hidden text-sm font-medium text-neutral-700 hover:text-black md:inline-block">
            {role === 'HOST' ? t('partnerDashboard') : t('rentMyVehicles')}
          </Link>
          <Link href={`${localePrefix}/messages`} className="hidden rounded-full p-2 text-neutral-700 hover:bg-neutral-100 md:block" aria-label={t('messages')}>
            <NavMenuIcon name="chat" />
          </Link>
          <Link href={`${localePrefix}/bookings`} className="hidden rounded-full p-2 text-neutral-700 hover:bg-neutral-100 md:block" aria-label={t('myBookings')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
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
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                  {dropdownContent}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Search — desktop inline bar, mobile trigger opens bottom sheet */}
      <div className="border-t border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-6xl justify-center px-4 py-3">
          {/* Mobile: trigger bar that opens bottom sheet */}
          <button
            type="button"
            onClick={() => setSearchSheetOpen(true)}
            className="flex w-full flex-1 items-center gap-2 overflow-hidden rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] px-4 py-2.5 text-left shadow-ds-search md:hidden"
            aria-label={tSearch('searchTriggerLabel')}
          >
            <svg className="h-4 w-4 shrink-0 text-ds-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="truncate text-sm text-ds-gray">{tSearch('searchTriggerLabel')}</span>
          </button>
          {/* Desktop: inline single-line search bar */}
          <div className="hidden w-full max-w-3xl md:block">
            <HeaderSearchBar />
          </div>
        </div>
      </div>

      <SearchBottomSheet open={searchSheetOpen} onClose={() => setSearchSheetOpen(false)}>
        <HeaderSearchBar
          variant="stacked"
          onAfterSubmit={() => setSearchSheetOpen(false)}
        />
      </SearchBottomSheet>
    </header>
  );
}
