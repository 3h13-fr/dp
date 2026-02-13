'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingHeaderProps {
  status: BookingStatus;
  bookingId: string;
}

export function BookingHeader({ status, bookingId }: BookingHeaderProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking');

  const getTitle = (): string => {
    switch (status) {
      case 'PENDING':
        return t('status.pending');
      case 'CONFIRMED':
        return t('status.confirmed');
      case 'IN_PROGRESS':
        return t('status.ongoing');
      case 'COMPLETED':
        return t('status.completed');
      case 'CANCELLED':
        return t('status.cancelled');
      default:
        return t('title');
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center text-foreground hover:text-muted-foreground"
          aria-label="Retour"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold">{getTitle()}</h1>
        <Link
          href={`/${locale}/messages?bookingId=${bookingId}`}
          className="flex items-center text-foreground hover:text-muted-foreground"
          aria-label="Messages"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
