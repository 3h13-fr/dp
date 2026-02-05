'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getListingTitle } from '@/lib/listings';

const LISTING_TYPE_TO_VERTICAL: Record<string, 'location' | 'experience' | 'ride'> = {
  CAR_RENTAL: 'location',
  CHAUFFEUR: 'ride',
  MOTORIZED_EXPERIENCE: 'experience',
};

type BookingPaySummaryProps = {
  booking: {
    startAt: string;
    endAt: string;
    totalAmount: string | number;
    currency: string;
    cautionAmount?: string | number | null;
    listing: {
      id: string;
      slug?: string | null;
      title?: string | null;
      displayName?: string | null;
      displayTitle?: string | null;
      type?: string;
      photos?: Array<{ url: string; order?: number }>;
    };
  };
};

export function BookingPaySummary({ booking }: BookingPaySummaryProps) {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const listing = booking.listing;
  const vertical = (listing?.type && LISTING_TYPE_TO_VERTICAL[listing.type]) || 'location';
  const slug = listing?.slug ?? listing?.id ?? '';

  const totalAmount = typeof booking.totalAmount === 'string' ? parseFloat(booking.totalAmount) : Number(booking.totalAmount);
  const cautionAmount = booking.cautionAmount != null
    ? (typeof booking.cautionAmount === 'string' ? parseFloat(booking.cautionAmount) : Number(booking.cautionAmount))
    : 0;
  const currency = booking.currency ?? 'EUR';
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const photos = listing?.photos?.length
    ? [...listing.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const firstPhoto = photos[0];

  const formatDateRange = () => {
    try {
      const start = new Date(booking.startAt);
      const end = new Date(booking.endAt);
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).formatRange(start, end);
    } catch {
      return '—';
    }
  };

  return (
    <div
      className="rounded-2xl border border-[var(--color-gray-light)] bg-white p-6 shadow-[var(--shadow-card)]"
      data-testid="booking-pay-summary"
    >
      <div className="flex gap-4">
        {firstPhoto?.url ? (
          <Link
            href={`/${locale}/${vertical}/${slug}`}
            className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-gray-bg)]"
          >
            <img
              src={firstPhoto.url}
              alt=""
              className="h-full w-full object-cover"
            />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link
            href={`/${locale}/${vertical}/${slug}`}
            className="font-medium text-[var(--color-primary)] underline"
          >
            {listing ? getListingTitle(listing) : '—'}
          </Link>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
        <p className="text-sm font-medium text-[var(--color-black)]">{t('dates')}</p>
        <p className="mt-1 text-sm text-[var(--color-gray-dark)]">{formatDateRange()}</p>
      </div>

      <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
        <p className="text-sm font-medium text-[var(--color-black)]">{t('priceDetails')}</p>
        <p className="mt-2 text-base font-semibold text-[var(--color-black)]">
          {t('total')} {currency}: {formatPrice(totalAmount)}
        </p>
        {cautionAmount > 0 && (
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {t('cautionBlocked')}: {formatPrice(cautionAmount)}
          </p>
        )}
      </div>
    </div>
  );
}
