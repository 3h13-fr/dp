'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getListingTitle } from '@/lib/listings';
import { S3Image } from '@/components/S3Image';

interface BookingHeroSectionProps {
  listing: {
    id: string;
    slug?: string;
    title?: string | null;
    displayName?: string | null;
    photos?: Array<{ url: string; order?: number }>;
  };
  startAt: string;
  endAt: string;
  bookingId: string;
}

export function BookingHeroSection({ listing, startAt, endAt, bookingId }: BookingHeroSectionProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking.hero');

  const photo = listing.photos?.[0] ?? listing.photos?.find((p) => p.order === 0);
  const vehicleTitle = getListingTitle(listing);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getListingPath = () => {
    // Determine vertical from listing type if available, otherwise default to location
    return `/${locale}/location/${listing.slug ?? listing.id}`;
  };

  return (
    <div className="relative">
      {/* Back button overlay */}
      <button
        type="button"
        onClick={() => router.back()}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors lg:hidden"
        aria-label="Retour"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Vehicle Image */}
      <div className="relative h-80 w-full overflow-hidden bg-muted lg:h-96">
        {photo?.url ? (
          <S3Image
            src={photo.url}
            alt={vehicleTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {t('noImage')}
          </div>
        )}
      </div>

      {/* Content below image */}
      <div className="px-4 pt-6 lg:px-6">
        {/* Vehicle Title */}
        <h1 className="text-2xl font-bold lg:text-3xl">{vehicleTitle}</h1>

        {/* Dates */}
        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{t('startDate')}</p>
            <p className="mt-1 text-base font-medium">{formatDate(startAt)}</p>
          </div>
          <div className="flex-shrink-0 pt-6">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{t('returnDate')}</p>
            <p className="mt-1 text-base font-medium">{formatDate(endAt)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <Link
            href={`/${locale}/messages?bookingId=${bookingId}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{t('messageOwner')}</span>
          </Link>
          <Link
            href={getListingPath()}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{t('viewListing')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
