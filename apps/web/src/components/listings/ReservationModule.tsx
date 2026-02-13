'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { calculateListingPrice, calculateOptionsPrice, type ListingForPricing } from '@/lib/pricing';
import { ReservationDateBlock } from './ReservationDateBlock';
import { ReservationOptions } from './ReservationOptions';
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
};

const CLEANING_FEE = 0; // optional, can come from listing later

function toDateTimeLocal(value: string): string {
  if (!value) return '';
  if (value.includes('T')) return value.slice(0, 16);
  if (value.length === 10) return `${value}T09:00`;
  return value;
}

export function ReservationModule({
  listing,
  vertical = 'location',
  initialStartAt,
  initialEndAt,
  canBook = true,
}: {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  initialStartAt?: string;
  initialEndAt?: string;
  canBook?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('listing');
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
    const subtotal = priceCalculation.finalPrice;
    const listingCoords =
      listing.latitude != null && listing.longitude != null
        ? { lat: listing.latitude, lng: listing.longitude }
        : null;
    const optionsPrice = calculateOptionsPrice(
      selectedOptions,
      listing.options as Parameters<typeof calculateOptionsPrice>[1],
      listingCoords
    );
    const total = subtotal + CLEANING_FEE + optionsPrice;
    return { days: priceCalculation.days, subtotal, optionsPrice, total };
  }, [priceCalculation, selectedOptions, listing.options, listing.latitude, listing.longitude]);

  const checkoutHref = (() => {
    const base = `/${locale}/${vertical}/${slug}/checkout`;
    const params = new URLSearchParams();
    if (startAt) params.set('startAt', startAt);
    if (endAt) params.set('endAt', endAt);
    if (Object.keys(selectedOptions).length > 0) {
      params.set('options', JSON.stringify(selectedOptions));
    }
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  })();

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
  const listingType = listing.type || 'CAR_RENTAL';

  return (
    <div
      className="sticky top-24 hidden rounded-2xl border border-[var(--color-gray-light)] bg-white p-6 shadow-[var(--shadow-card)] md:block"
      data-testid="reservation-module"
    >
      {/* Price header - total prominent */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--color-black)]">
            {priceCalculation
              ? formatPrice(total)
              : pricePerDay != null
                ? formatPrice(pricePerDay)
                : '—'}
          </span>
          <span className="text-sm text-[var(--color-gray)]">
            {t('totalLabel') || t('total')}
          </span>
        </div>
        {hasDates && days > 0 && priceCalculation && (
          <p className="mt-1 text-sm text-[var(--color-gray)]">
            {priceCalculation.discount > 0 ? (
              <>
                {formatPrice(priceCalculation.basePrice)} → {formatPrice(priceCalculation.finalPrice)}{' '}
                <span className="text-[var(--color-primary)]">
                  (-{priceCalculation.discount}% {priceCalculation.discountThreshold ? `J+${priceCalculation.discountThreshold}` : ''})
                </span>
              </>
            ) : (
              <>
                {priceCalculation.isHourly
                  ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                  : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
              </>
            )}
          </p>
        )}
      </div>

      {/* Dates - 2 columns with separator */}
      <div className="mb-6">
        <ReservationDateBlock
          startAt={startAt}
          endAt={endAt}
          onStartChange={setStartAt}
          onEndChange={setEndAt}
          locale={locale}
          minStart={new Date().toISOString().slice(0, 16)}
          minEnd={startAt || new Date().toISOString().slice(0, 16)}
        />
      </div>

      {/* Options - insurance, second driver, delivery, flexible return */}
      {startAt && endAt && listingType === 'CAR_RENTAL' && (
        <div className="mb-6 space-y-4">
          <ReservationOptions
            listing={listing}
            selectedOptions={selectedOptions}
            onOptionsChange={setSelectedOptions}
            startAt={startAt}
            endAt={endAt}
            days={days}
            currency={currency}
            isMobile={false}
          />
        </div>
      )}

      {/* Total block */}
      <div className="space-y-2 border-t border-[var(--color-gray-light)] pt-6">
        {days > 0 && priceCalculation && (
          <>
            {priceCalculation.discount > 0 && (
              <div className="flex justify-between text-sm text-[var(--color-gray-dark)]">
                <span>
                  {priceCalculation.isHourly
                    ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                    : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
                </span>
                <span>{formatPrice(priceCalculation.basePrice)}</span>
              </div>
            )}
            {priceCalculation.discount > 0 && (
              <div className="flex justify-between text-sm text-[var(--color-primary)]">
                <span>{t('discountApplied', { percent: priceCalculation.discount }) || `Remise ${priceCalculation.discount}%`}</span>
                <span>-{formatPrice(priceCalculation.basePrice - priceCalculation.finalPrice)}</span>
              </div>
            )}
            {!priceCalculation.discount && (
              <div className="flex justify-between text-sm text-[var(--color-gray-dark)]">
                <span>
                  {priceCalculation.isHourly
                    ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                    : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('daysCount', { count: priceCalculation.days })}`}
                </span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            )}
            {CLEANING_FEE > 0 && (
              <div className="flex justify-between text-sm text-[var(--color-gray-dark)]">
                <span>{t('cleaningFee')}</span>
                <span>{formatPrice(CLEANING_FEE)}</span>
              </div>
            )}
            {optionsPrice > 0 && (
              <div className="flex justify-between text-sm text-[var(--color-gray-dark)]">
                <span>{t('options') || 'Options'}</span>
                <span>{formatPrice(optionsPrice)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between border-t border-[var(--color-gray-light)] pt-3 text-base font-semibold text-[var(--color-black)]">
          <span>{t('total')}</span>
          <span className="text-lg">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Reserve button */}
      {canBook ? (
        <Link
          href={checkoutHref}
          className="mt-6 flex w-full items-center justify-center rounded-ds-button bg-[var(--color-primary)] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-md active:scale-[0.99]"
          data-testid="listing-book-link"
        >
          {vertical === 'ride' ? t('reservationRequest') : t('reserve')}
        </Link>
      ) : (
        <div
          className="mt-6 flex w-full cursor-not-allowed items-center justify-center rounded-ds-button bg-[var(--color-gray)] px-6 py-3.5 text-base font-semibold text-white opacity-70"
          data-testid="listing-book-link-disabled"
        >
          {t('reservationsUnavailable')}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-[var(--color-gray)]">
        {t('taxesIncluded')}
      </p>
    </div>
  );
}
