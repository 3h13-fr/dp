'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
import { useEffect, useState, useRef, useMemo } from 'react';
import { getToken, clearToken } from '@/lib/api';
import Image from 'next/image';
import { HeaderSearchBar } from '@/components/HeaderSearchBar';
import { HeaderCategories } from '@/components/HeaderCategories';
import { SearchBottomSheet } from '@/components/SearchBottomSheet';
import { MobileSearchFlow } from '@/components/search/MobileSearchFlow';
import { FiltersModal } from '@/components/filters/FiltersModal';
import { FiltersSheet } from '@/components/filters/FiltersSheet';
import { useAuthModal } from '@/contexts/AuthModalContext';

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
  const tListing = useTranslations('listings');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { openLogin } = useAuthModal();
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [searchSheetListingType, setSearchSheetListingType] = useState<'location' | 'experience' | 'ride'>('location');
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  // #region agent log
  useEffect(() => {
    // Désactiver les appels analytics en développement pour éviter les erreurs dans la console
    if (process.env.NODE_ENV === 'production') {
      fetch('http://127.0.0.1:7242/ingest/d4d80e1e-130a-4236-9b97-782fd171848c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Header.tsx',message:'Header mounted',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    }
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

  // Déterminer si on doit afficher la barre de recherche
  const shouldShowSearchBar = pathWithoutLocale === '/' ||
    pathWithoutLocale === '/location' ||
    pathWithoutLocale.startsWith('/location/') ||
    pathWithoutLocale === '/experience' ||
    pathWithoutLocale.startsWith('/experience/') ||
    pathWithoutLocale === '/ride' ||
    pathWithoutLocale.startsWith('/ride/');

  // Déterminer si on doit afficher le bouton filtres (uniquement sur les pages de liste, pas homepage ni détail)
  const shouldShowFiltersButton = pathWithoutLocale === '/location' ||
    pathWithoutLocale === '/experience' ||
    pathWithoutLocale === '/ride';

  // Déterminer si on doit afficher les catégories (uniquement sur homepage et /location)
  const shouldShowCategories = pathWithoutLocale === '/' || pathWithoutLocale === '/location';

  // Déterminer le type de listing depuis le pathname
  const getListingTypeFromPath = (): 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR' => {
    if (pathWithoutLocale === '/location' || pathWithoutLocale.startsWith('/location/')) {
      return 'CAR_RENTAL';
    }
    if (pathWithoutLocale === '/experience' || pathWithoutLocale.startsWith('/experience/')) {
      return 'MOTORIZED_EXPERIENCE';
    }
    if (pathWithoutLocale === '/ride' || pathWithoutLocale.startsWith('/ride/')) {
      return 'CHAUFFEUR';
    }
    return 'CAR_RENTAL'; // Default
  };

  const currentListingType = getListingTypeFromPath();

  // Fonction pour formater la localisation
  const formatLocationSummary = (city: string | null, country: string | null): string | null => {
    const parts = [city, country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Fonction pour formater les dates
  const formatDatesSummary = (
    startDate: string | null,
    endDate: string | null,
    date: string | null,
    isLocation: boolean,
  ): string | null => {
    if (isLocation) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startFormatted = start.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const endFormatted = end.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return `${startFormatted} · ${endFormatted}`;
      }
    } else {
      if (date) {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return null;
  };

  // Lire les paramètres de recherche depuis l'URL
  const city = searchParams.get('city');
  const country = searchParams.get('country');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const date = searchParams.get('date'); // Pour experience/ride

  // Déterminer si on est sur une page location
  const isLocationPage = pathWithoutLocale === '/location' || pathWithoutLocale.startsWith('/location/');

  // Formater le résumé de recherche
  const locationSummary = useMemo(
    () => formatLocationSummary(city, country),
    [city, country],
  );
  const datesSummary = useMemo(
    () => formatDatesSummary(startDate, endDate, date, isLocationPage),
    [startDate, endDate, date, isLocationPage, locale],
  );

  // Déterminer le texte à afficher dans le bouton mobile
  const mobileSearchButtonText = useMemo(() => {
    if (locationSummary || datesSummary) {
      return (
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          {locationSummary && (
            <span className="truncate text-sm text-ds-gray leading-tight">{locationSummary}</span>
          )}
          {datesSummary && (
            <span className="truncate text-sm text-ds-gray leading-tight">{datesSummary}</span>
          )}
        </div>
      );
    }
    return <span className="truncate text-sm text-ds-gray">{tSearch('searchTriggerLabel')}</span>;
  }, [locationSummary, datesSummary, tSearch]);

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
            {t('myBookings')}
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
      <Link href={`${localePrefix}/profil#languageAndCurrency`} className={menuItemClass} onClick={() => setMenuOpen(false)}>
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
        <button
          type="button"
          className={menuItemClass}
          onClick={() => {
            setMenuOpen(false);
            openLogin();
          }}
        >
          <NavMenuIcon name="login" />
          {t('account')}
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white" data-testid="app-header">
      {/* Row 1: Logo, nav tabs, user actions — hidden on mobile, only search bar shown */}
      <div className="mx-auto hidden h-14 max-w-6xl items-center justify-between px-4 md:flex">
        <Link href={localePrefix} className="flex items-center gap-2 text-lg font-semibold text-black" aria-label="DrivePark" data-testid="header-logo">
          <Image 
            src="https://drivepark.net/storage/2024/06/26/group-3-2-1719388913.png" 
            alt="DrivePark" 
            width={24} 
            height={24} 
            className="h-6 w-6 shrink-0" 
            aria-hidden 
          />
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
          <div className="relative hidden md:block">
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
      {shouldShowSearchBar && (
        <div className="border-t border-neutral-100 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-3">
            {/* Mobile: trigger bar that opens bottom sheet */}
            <button
              type="button"
              onClick={() => setSearchSheetOpen(true)}
              className="flex w-full flex-1 items-center gap-2 overflow-hidden rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] px-4 min-h-[55px] text-left shadow-[var(--shadow-search-mobile)] md:hidden"
              aria-label={tSearch('searchTriggerLabel')}
            >
              <svg className="h-4 w-4 shrink-0 text-ds-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {mobileSearchButtonText}
            </button>
            {/* Desktop: inline single-line search bar + filters button */}
            <div className="hidden w-full max-w-3xl md:flex md:items-center md:gap-2">
              <div className="flex-1">
                <HeaderSearchBar />
              </div>
              {shouldShowFiltersButton && (
                <>
                  <button
                    ref={filtersButtonRef}
                    type="button"
                    onClick={() => setFiltersModalOpen(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] text-neutral-700 hover:bg-neutral-50 transition-colors"
                    aria-label="Filters"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  <FiltersModal
                    open={filtersModalOpen}
                    onClose={() => setFiltersModalOpen(false)}
                    listingType={currentListingType}
                    buttonRef={filtersButtonRef}
                  />
                  <FiltersSheet
                    open={filtersSheetOpen}
                    onClose={() => setFiltersSheetOpen(false)}
                    listingType={currentListingType}
                  />
                </>
              )}
            </div>
            {/* Mobile: filters button */}
            {shouldShowFiltersButton && (
              <button
                type="button"
                onClick={() => setFiltersSheetOpen(true)}
                className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] text-neutral-700 hover:bg-neutral-50 transition-colors"
                aria-label={t('filters')}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Catégories de véhicules — uniquement sur homepage et /location */}
      {shouldShowCategories && <HeaderCategories />}

      <SearchBottomSheet open={searchSheetOpen} onClose={() => setSearchSheetOpen(false)}>
        <div className="flex flex-col h-full">
          {/* Segmented control sticky top */}
          <div className="sticky top-0 z-10 mb-4 flex rounded-lg border border-neutral-200 bg-white p-1" role="tablist" aria-label={tSearch('searchTriggerLabel')}>
            {tabLinks.map(({ href, label }) => {
              const type = href === '/location' ? 'location' : href === '/experience' ? 'experience' : 'ride';
              const active = searchSheetListingType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSearchSheetListingType(type)}
                  className={`flex-1 rounded-md py-2 text-center text-sm font-medium transition-colors ${active ? 'bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {/* Mobile search flow */}
          <div className="flex-1 min-h-0">
            <MobileSearchFlow
              listingType={searchSheetListingType}
              onAfterSubmit={() => setSearchSheetOpen(false)}
            />
          </div>
        </div>
      </SearchBottomSheet>
    </header>
  );
}
