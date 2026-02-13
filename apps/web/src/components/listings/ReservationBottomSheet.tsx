'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { calculateListingPrice, calculateOptionsPrice, type ListingForPricing } from '@/lib/pricing';
import { ReservationDateBlock } from './ReservationDateBlock';
import { ReservationOptions } from './ReservationOptions';
import { S3Image } from '@/components/S3Image';
import { getListingTitle } from '@/lib/listings';
import type { CheckoutOptions } from '@/lib/checkout-state';
import type { ListingOptions } from '@/lib/listing-options';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayTitle?: string | null;
  displayName?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
  options?: ListingOptions | null;
  photos?: Array<{ url: string; order?: number }>;
};

type ReservationBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  initialStartAt?: string;
  initialEndAt?: string;
  canBook?: boolean;
};

const CLEANING_FEE = 0;

function toDateTimeLocal(value: string): string {
  if (!value) return '';
  if (value.includes('T')) return value.slice(0, 16);
  if (value.length === 10) return `${value}T09:00`;
  return value;
}

export function ReservationBottomSheet({
  open,
  onClose,
  listing,
  vertical,
  initialStartAt,
  initialEndAt,
  canBook = true,
}: ReservationBottomSheetProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('listing');
  const tCommon = useTranslations('common');
  const slug = listing.slug ?? listing.id;
  const pricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay)
      : null;

  const [startAt, setStartAt] = useState(() => toDateTimeLocal(initialStartAt ?? ''));
  const [endAt, setEndAt] = useState(() => toDateTimeLocal(initialEndAt ?? ''));
  const [selectedOptions, setSelectedOptions] = useState<CheckoutOptions>({});

  useEffect(() => {
    if (open) {
      setStartAt(toDateTimeLocal(initialStartAt ?? ''));
      setEndAt(toDateTimeLocal(initialEndAt ?? ''));
      setSelectedOptions({});
    }
  }, [open, initialStartAt, initialEndAt]);

  const priceCalculation = useMemo(() => {
    if (!startAt || !endAt) return null;
    const listingForPricing: ListingForPricing = {
      pricePerDay: pricePerDay,
      currency: listing.currency,
      options: listing.options,
    };
    return calculateListingPrice(startAt, endAt, listingForPricing);
  }, [startAt, endAt, pricePerDay, listing.currency, listing.options]);

  const { days, subtotal, optionsPrice, total } = useMemo(() => {
    if (!priceCalculation) return { days: 0, subtotal: 0, optionsPrice: 0, total: 0 };
    const sub = priceCalculation.finalPrice;
    const listingCoords =
      listing.latitude != null && listing.longitude != null
        ? { lat: listing.latitude, lng: listing.longitude }
        : null;
    const optPrice = calculateOptionsPrice(
      selectedOptions,
      listing.options as Parameters<typeof calculateOptionsPrice>[1],
      listingCoords
    );
    return {
      days: priceCalculation.days,
      subtotal: sub,
      optionsPrice: optPrice,
      total: sub + CLEANING_FEE + optPrice,
    };
  }, [priceCalculation, selectedOptions, listing.options, listing.latitude, listing.longitude]);

  const currency = listing.currency ?? 'EUR';
  const formatPrice = (n: number) => `${n} ${currency}`;

  const formatDateDisplay = (dateString: string) => {
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

  const formattedStartDate = formatDateDisplay(startAt);
  const formattedEndDate = formatDateDisplay(endAt);
  const hasDates = formattedStartDate && formattedEndDate;

  const isValid = Boolean(startAt && endAt);
  const listingType = listing.type || 'CAR_RENTAL';

  const handleReserve = () => {
    if (!isValid) return;
    const base = `/${locale}/${vertical}/${slug}/checkout`;
    const params = new URLSearchParams();
    params.set('startAt', startAt);
    params.set('endAt', endAt);
    if (Object.keys(selectedOptions).length > 0) {
      params.set('options', JSON.stringify(selectedOptions));
    }
    router.push(`${base}?${params.toString()}`);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const photo = listing.photos?.[0] ?? listing.photos?.find((p) => p.order === 0);

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/40 transition-opacity md:hidden"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-2xl border-t border-[var(--color-gray-light)] bg-white shadow-xl md:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-sheet-title"
      >
        {/* Header: title + close + mini vehicle card */}
        <div className="shrink-0 border-b border-[var(--color-gray-light)] px-4 py-4">
          <div className="relative flex items-center justify-center">
            <h2 id="reservation-sheet-title" className="text-lg font-semibold">
              {t('yourReservation') || 'Votre réservation'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--color-gray-dark)] hover:bg-[var(--color-gray-light)]/50"
              aria-label={tCommon('close')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--color-gray-light)] p-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-gray-light)]/30">
              {photo?.url ? (
                <S3Image src={photo.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--color-gray)]">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--color-black)]">
                {getListingTitle(listing)}
              </p>
              {pricePerDay != null && (
                <p className="text-sm text-[var(--color-gray-dark)]">
                  {formatPrice(pricePerDay)} {t('perDay')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 safe-area-pb">
          <div className="space-y-6">
            {/* Price total */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-black)]">
                  {priceCalculation ? formatPrice(total) : pricePerDay != null ? formatPrice(pricePerDay) : '—'}
                </span>
                <span className="text-sm text-[var(--color-gray)]">
                  {t('totalLabel') || t('total')}
                </span>
              </div>
              {hasDates && days > 0 && priceCalculation && (
                <p className="mt-1 text-sm text-[var(--color-gray)]">
                  {priceCalculation.discount > 0
                    ? `${formatPrice(priceCalculation.basePrice)} → ${formatPrice(priceCalculation.finalPrice)} (-${priceCalculation.discount}%)`
                    : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
                </p>
              )}
            </div>

            {/* Dates */}
            <ReservationDateBlock
              startAt={startAt}
              endAt={endAt}
              onStartChange={setStartAt}
              onEndChange={setEndAt}
              locale={locale}
              minStart={new Date().toISOString().slice(0, 16)}
              minEnd={startAt || new Date().toISOString().slice(0, 16)}
            />

            {/* Options */}
            {startAt && endAt && listingType === 'CAR_RENTAL' && (
              <ReservationOptions
                listing={listing}
                selectedOptions={selectedOptions}
                onOptionsChange={setSelectedOptions}
                startAt={startAt}
                endAt={endAt}
                days={days}
                currency={currency}
                isMobile={true}
              />
            )}

            {/* Price breakdown */}
            {days > 0 && priceCalculation && (
              <div className="space-y-2 border-t border-[var(--color-gray-light)] pt-4 text-sm">
                {priceCalculation.discount > 0 && (
                  <>
                    <div className="flex justify-between text-[var(--color-gray-dark)]">
                      <span>
                        {priceCalculation.isHourly
                          ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                          : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
                      </span>
                      <span>{formatPrice(priceCalculation.basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--color-primary)]">
                      <span>{t('discountApplied', { percent: priceCalculation.discount }) || `Remise ${priceCalculation.discount}%`}</span>
                      <span>-{formatPrice(priceCalculation.basePrice - priceCalculation.finalPrice)}</span>
                    </div>
                  </>
                )}
                {!priceCalculation.discount && (
                  <div className="flex justify-between text-[var(--color-gray-dark)]">
                    <span>
                      {priceCalculation.isHourly
                        ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                        : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
                    </span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                )}
                {optionsPrice > 0 && (
                  <div className="flex justify-between text-[var(--color-gray-dark)]">
                    <span>{t('options') || 'Options'}</span>
                    <span>{formatPrice(optionsPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--color-gray-light)] pt-2 font-semibold text-[var(--color-black)]">
                  <span>{t('total')}</span>
                  <span className="text-lg">{formatPrice(total)}</span>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-[var(--color-gray)]">
              {t('taxesIncluded')}
            </p>
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="shrink-0 border-t border-[var(--color-gray-light)] bg-white px-4 py-4">
          <button
            onClick={handleReserve}
            disabled={!isValid || !canBook}
            className="flex w-full items-center justify-center rounded-ds-button bg-[var(--color-primary)] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--color-primary)]"
            data-testid="listing-book-link-mobile-sheet"
          >
            {canBook
              ? vertical === 'ride'
                ? t('reservationRequest')
                : t('reserve')
              : t('reservationsUnavailable')}
          </button>
        </div>
      </div>
    </>
  );
}
