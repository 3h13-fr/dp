'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { clsx } from 'clsx';

export function HostBottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const prefix = `/${locale}/host`;

  const items = [
    { href: prefix, label: t('dashboard'), icon: 'home', key: 'dashboard' },
    { href: `${prefix}/messages`, label: t('messages'), icon: 'chat', key: 'messages' },
    { href: `${prefix}/listings`, label: t('listings'), icon: 'list', key: 'listings' },
    { href: `/${locale}/profil`, label: t('profile') || 'Profil', icon: 'user', key: 'profile' },
  ];

  const isActive = (href: string, exactMatch = false) => {
    if (exactMatch || href === prefix) {
      // Dashboard/Statistics is active if we're exactly on /host or /host/ (but not /host/listings, etc.)
      return pathname === prefix || pathname === `${prefix}/`;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white md:hidden safe-area-pb"
      aria-label="Navigation partenaire"
    >
      <div className="flex items-center justify-around">
        {items.map(({ href, label, icon, key }) => {
          const active = isActive(href, href === prefix);
          return (
            <Link
              key={key || href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors',
                active ? 'text-black' : 'text-neutral-500',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {icon === 'home' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )}
              {icon === 'chat' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {icon === 'list' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
              {icon === 'stats' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {icon === 'user' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
