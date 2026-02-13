'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export function BookingHelpSection() {
  const locale = useLocale();
  const t = useTranslations('booking.help');

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <h2 className="text-xl font-bold">{t('title')}</h2>

      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <div className="mt-4 flex flex-col gap-3">
        <Link
          href={`/${locale}/help`}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{t('helpCenter')}</span>
          </div>
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/${locale}/support`}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 7a7 7 0 01-7-7V7a7 7 0 0114 0v5a7 7 0 01-7 7z"
              />
            </svg>
            <span>{t('assistance')}</span>
          </div>
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
