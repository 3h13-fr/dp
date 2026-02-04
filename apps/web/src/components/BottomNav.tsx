'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { clsx } from 'clsx';

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('bottomNav');
  const prefix = `/${locale}`;

  const items = [
    { href: prefix, label: t('search'), icon: 'search' },
    { href: `${prefix}/favoris`, label: t('favorites'), icon: 'heart' },
    { href: `${prefix}/bookings`, label: t('reservations'), icon: 'star' },
    { href: `${prefix}/messages`, label: t('messages'), icon: 'chat' },
    { href: `${prefix}/profil`, label: t('assistance'), icon: 'headset' },
  ];

  const isActive = (href: string) => {
    if (href === prefix) return pathname === prefix || pathname === `${prefix}/`;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white md:hidden"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-around">
        {items.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors',
                active ? 'text-black' : 'text-neutral-500',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {icon === 'search' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {icon === 'heart' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              {icon === 'star' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {icon === 'chat' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {icon === 'headset' && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 7a7 7 0 01-7-7V7a7 7 0 0114 0v5a7 7 0 01-7 7z" />
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
