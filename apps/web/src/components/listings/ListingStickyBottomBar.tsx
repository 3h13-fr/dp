'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ReservationBottomSheet } from './ReservationBottomSheet';
import type { ListingOptions } from '@/lib/listing-options';

type ListingStickyBottomBarProps = {
  listing: {
    id: string;
    slug?: string;
    pricePerDay?: { toNumber?: () => number } | number | null;
    currency?: string;
    title?: string | null;
    displayTitle?: string | null;
    displayName?: string | null;
    type?: string;
    latitude?: number | null;
    longitude?: number | null;
    options?: ListingOptions | null;
    photos?: Array<{ url: string; order?: number }>;
  };
  vertical: 'location' | 'experience' | 'ride';
  startAt?: string;
  endAt?: string;
  totalPrice?: number;
  canBook?: boolean;
};

export function ListingStickyBottomBar({
  listing,
  vertical,
  startAt,
  endAt,
  totalPrice,
  canBook = true,
}: ListingStickyBottomBarProps) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const pricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay)
      : null;

  const currency = listing.currency ?? 'EUR';

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedStartDate = formatDate(startAt);
  const formattedEndDate = formatDate(endAt);

  // Calculate display price
  const displayPrice = totalPrice ?? pricePerDay ?? 0;
  const hasDates = formattedStartDate && formattedEndDate;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-[var(--color-gray-light)] bg-white px-4 py-3 shadow-[var(--shadow-dropdown)] md:hidden transition-shadow">
        <div className="min-w-0 flex-1">
          {hasDates ? (
            <>
              <p className="text-lg font-semibold text-[var(--color-black)] transition-opacity duration-200">
                {displayPrice.toLocaleString('fr-FR')} {currency} {t('totalLabel') || t('total')}
              </p>
              <p className="text-xs text-[var(--color-gray)]">
                {t('bookingDates', {
                  start: formattedStartDate,
                  end: formattedEndDate,
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-[var(--color-black)]">
                {pricePerDay != null ? `${pricePerDay.toLocaleString('fr-FR')} ${currency}` : '—'}{' '}
                {t('perDay')}
              </p>
              <p className="text-xs text-[var(--color-gray)]">{t('taxesIncluded')}</p>
            </>
          )}
        </div>
        <button
          onClick={() => canBook && setIsSheetOpen(true)}
          disabled={!canBook}
          className={`ml-4 shrink-0 rounded-ds-button px-6 py-3 font-semibold transition-all active:scale-[0.98] ${
            canBook
              ? 'bg-[var(--color-black)] text-white hover:opacity-90'
              : 'cursor-not-allowed bg-[var(--color-gray)] text-white opacity-70'
          }`}
          data-testid="listing-book-link-mobile"
        >
          {canBook ? (vertical === 'ride' ? t('reservationRequest') : t('reserve')) : t('reservationsUnavailable')}
        </button>
      </div>

      {/* Reservation Bottom Sheet */}
      <ReservationBottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        listing={listing}
        vertical={vertical}
        initialStartAt={startAt}
        initialEndAt={endAt}
        canBook={canBook}
      />
    </>
  );
}
