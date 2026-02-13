'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getListingTitle } from '@/lib/listings';
import { S3Image } from '@/components/S3Image';
import { ListingReviews } from '@/components/listings/ListingReviews';
import { calculateListingPrice, calculateOptionsPrice, type ListingForPricing } from '@/lib/pricing';
import { EditDatesModal } from './EditDatesModal';
import { EditTravelersModal } from './EditTravelersModal';
import { EditOptionsModal } from './EditOptionsModal';
import { RarityMessage } from './RarityMessage';
import type { CheckoutOptions } from '@/lib/checkout-state';
import type { ListingOptions } from '@/lib/listing-options';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  displayTitle?: string | null;
  type?: string;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  caution?: { toNumber?: () => number } | number | null;
  cancellationPolicy?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
  options?: ListingOptions | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CheckoutSummaryProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  startAt: string;
  endAt: string;
  travelers: number;
  options?: CheckoutOptions;
  onDatesChange?: (startAt: string, endAt: string) => void;
  onTravelersChange?: (travelers: number) => void;
  onOptionsChange?: (options: CheckoutOptions) => void;
};

function toNum(v: { toNumber?: () => number } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  return Number(v);
}

export function CheckoutSummary({
  listing,
  vertical,
  startAt,
  endAt,
  travelers,
  options = {},
  onDatesChange,
  onTravelersChange,
  onOptionsChange,
}: CheckoutSummaryProps) {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const slug = listing.slug ?? listing.id;

  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showTravelersModal, setShowTravelersModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  const pricePerDay = toNum(listing.pricePerDay);
  const caution = toNum(listing.caution);
  const currency = listing.currency ?? 'EUR';
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const priceCalculation = (() => {
    if (!startAt || !endAt) return null;

    const listingForPricing: ListingForPricing = {
      pricePerDay: listing.pricePerDay,
      currency: listing.currency,
      options: listing.options,
    };

    return calculateListingPrice(startAt, endAt, listingForPricing);
  })();

  const days = priceCalculation?.days ?? 0;
  const subtotal = priceCalculation?.finalPrice ?? 0;
  const listingCoords = listing.latitude != null && listing.longitude != null
    ? { lat: listing.latitude, lng: listing.longitude }
    : null;
  const optionsPrice = calculateOptionsPrice(options || {}, listing.options, listingCoords);
  const total = subtotal + optionsPrice;

  const photos = listing.photos?.length
    ? [...listing.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const firstPhoto = photos[0];

  const formatDateRange = () => {
    if (!startAt || !endAt) return '—';
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).formatRange(start, end);
    } catch {
      return `${startAt} – ${endAt}`;
    }
  };

  return (
    <>
      <div
        className="rounded-[var(--radius-card-medium)] bg-white p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24"
        data-testid="checkout-summary"
      >
        {/* Listing card with image, title, and rating - Airbnb style */}
        <div className="flex gap-4">
          {firstPhoto?.url ? (
            <Link
              href={`/${locale}/${vertical}/${slug}`}
              className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-gray-bg)]"
            >
              <S3Image
                src={firstPhoto.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <Link
              href={`/${locale}/${vertical}/${slug}`}
              className="block truncate font-bold text-[var(--color-black)]"
              title={getListingTitle(listing)}
            >
              {getListingTitle(listing)}
            </Link>
            <div className="mt-1">
              <ListingReviews listingId={listing.id} />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-black)]">
              {t('dates')}
            </span>
            {onDatesChange && (
              <button
                type="button"
                onClick={() => setShowDatesModal(true)}
                className="text-sm font-medium text-[var(--color-gray)] hover:text-[var(--color-black)] transition-colors"
              >
                {t('modify')}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {formatDateRange()}
          </p>
          {/* Message de rareté juste sous les dates */}
          <RarityMessage />
        </div>

        {/* Travelers */}
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-black)]">
              {t('travelers') || 'Voyageurs'}
            </span>
            {onTravelersChange && (
              <button
                type="button"
                onClick={() => setShowTravelersModal(true)}
                className="text-sm font-medium text-[var(--color-gray)] hover:text-[var(--color-black)] transition-colors"
              >
                {t('modify')}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {travelers} {travelers === 1 ? (t('traveler') || 'voyageur') : (t('travelers') || 'voyageurs')}
          </p>
        </div>

        {/* Options */}
        {(options?.insurance || options?.guarantees || options?.delivery?.enabled) && (
          <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-black)]">
                {t('options') || 'Options'}
              </span>
              {onOptionsChange && (
                <button
                  type="button"
                  onClick={() => setShowOptionsModal(true)}
                  className="text-sm font-medium text-[var(--color-gray)] hover:text-[var(--color-black)] transition-colors"
                >
                  {t('modify')}
                </button>
              )}
            </div>
            <div className="mt-1 space-y-1 text-sm text-[var(--color-gray-dark)]">
              {options.insurance && (
                <p>{t('insurance') || 'Assurance'}</p>
              )}
              {options.guarantees && (
                <p>{t('guarantees') || 'Garanties supplémentaires'}</p>
              )}
              {options.delivery?.enabled && options.delivery.address && (
                <p>
                  {t('delivery') || 'Livraison'}: {options.delivery.address}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Prix total */}
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-black)]">
              {t('total') || 'Prix total'}
            </span>
            <button
              type="button"
              onClick={() => setShowPriceDetails(!showPriceDetails)}
              className="text-sm font-medium text-[var(--color-gray)] hover:text-[var(--color-black)] transition-colors"
            >
              {t('details') || 'Détails'}
            </button>
          </div>
          <p className="mt-1 text-base font-semibold text-[var(--color-black)]">
            {formatPrice(total)} {currency}
          </p>

          {/* Price details expandable */}
          {showPriceDetails && days > 0 && priceCalculation ? (
            <div className="mt-3 space-y-2 text-sm text-[var(--color-gray-dark)]">
              {priceCalculation.discount > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span>
                      {priceCalculation.isHourly
                        ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                        : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('nights', { count: priceCalculation.days })}`}
                    </span>
                    <span>{formatPrice(priceCalculation.basePrice)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-primary)]">
                    <span>
                      {t('discountApplied', { percent: priceCalculation.discount }) || `Remise ${priceCalculation.discount}%`}
                    </span>
                    <span>-{formatPrice(priceCalculation.basePrice - priceCalculation.finalPrice)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>
                    {priceCalculation.isHourly
                      ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                      : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('nights', { count: priceCalculation.days })}`}
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              )}
              {optionsPrice > 0 && (
                <>
                  {options?.insurance && listing.options?.insurance?.price != null && (
                    <div className="flex justify-between">
                      <span>{t('insurance') || 'Assurance'}</span>
                      <span>{formatPrice(listing.options.insurance.price)}</span>
                    </div>
                  )}
                  {options?.guarantees && (
                    <div className="flex justify-between">
                      <span>{t('guarantees') || 'Garanties'}</span>
                      <span>{formatPrice(25)}</span>
                    </div>
                  )}
                  {options?.delivery?.enabled && listing.options?.delivery && (listing.options.delivery.pricePerKm != null || listing.options.delivery.price != null) && (
                    <div className="flex justify-between">
                      <span>{t('delivery') || 'Livraison'}</span>
                      <span>
                        {listing.options.delivery.pricePerKm != null && options.delivery?.coordinates && listing.latitude != null && listing.longitude != null
                          ? (() => {
                              const R = 6371;
                              const dLat = ((options.delivery.coordinates.lat - listing.latitude) * Math.PI) / 180;
                              const dLng = ((options.delivery.coordinates.lng - listing.longitude) * Math.PI) / 180;
                              const a = Math.sin(dLat / 2) ** 2 + Math.cos((listing.latitude * Math.PI) / 180) * Math.cos((options.delivery.coordinates.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
                              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                              const distance = R * c;
                              return formatPrice(distance * listing.options.delivery.pricePerKm);
                            })()
                          : listing.options.delivery.price != null
                            ? formatPrice(listing.options.delivery.price)
                            : `${formatPrice(listing.options.delivery.pricePerKm ?? 0)} / km`}
                      </span>
                    </div>
                  )}
                  {options?.secondDriver?.enabled && listing.options?.secondDriver?.price != null && (
                    <div className="flex justify-between">
                      <span>{t('secondDriver') || 'Second conducteur'}</span>
                      <span>{formatPrice(listing.options.secondDriver.price)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
          {caution > 0 && (
            <p className="mt-2 text-sm text-[var(--color-gray-dark)]">
              {t('cautionBlocked')}: {formatPrice(caution)}
            </p>
          )}
        </div>

        {/* Cancellation policy */}
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <p className="text-sm text-[var(--color-gray-dark)]">
            {listing.cancellationPolicy || t('cancellationFree') || 'Cette réservation n\'est pas remboursable.'}
          </p>
          <Link
            href={`/${locale}/${vertical}/${slug}#cancellation`}
            className="mt-1 block text-sm underline text-[var(--color-gray-dark)] hover:text-[var(--color-black)]"
          >
            {t('viewFullConditions') || 'Consulter les conditions complètes'}
          </Link>
        </div>
      </div>

      {/* Modals */}
      {showDatesModal && onDatesChange && (
        <EditDatesModal
          startAt={startAt}
          endAt={endAt}
          onSave={(newStartAt, newEndAt) => {
            onDatesChange(newStartAt, newEndAt);
            setShowDatesModal(false);
          }}
          onClose={() => setShowDatesModal(false)}
        />
      )}

      {showTravelersModal && onTravelersChange && (
        <EditTravelersModal
          travelers={travelers}
          onSave={(newTravelers) => {
            onTravelersChange(newTravelers);
            setShowTravelersModal(false);
          }}
          onClose={() => setShowTravelersModal(false)}
        />
      )}

      {showOptionsModal && onOptionsChange && (
        <EditOptionsModal
          options={options || {}}
          listingOptions={listing.options}
          listingLatitude={listing.latitude ?? undefined}
          listingLongitude={listing.longitude ?? undefined}
          onSave={(newOptions) => {
            onOptionsChange(newOptions);
            setShowOptionsModal(false);
          }}
          onClose={() => setShowOptionsModal(false)}
        />
      )}
    </>
  );
}
