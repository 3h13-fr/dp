'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import { S3Image } from '@/components/S3Image';
import { calculateListingPrice, type ListingForPricing } from '@/lib/pricing';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ListingCardProps = {
  id: string;
  slug?: string;
  vertical: 'location' | 'experience' | 'ride';
  title: string;
  city?: string | null;
  country?: string | null;
  pricePerDay?: number | { toNumber?: () => number } | null;
  currency?: string;
  photos?: Array<{ url: string; order?: number }>;
  host?: { firstName?: string | null; lastName?: string | null } | null;
  seats?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  createdAt?: string;
  startAt?: string;
  endAt?: string;
  options?: { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
  onCardClick?: () => void;
};

type RatingStats = { average: number; count: number };

const NEW_DAYS = 14;

function formatFuel(fuelType: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!fuelType) return null;
  const f = fuelType.toLowerCase();
  if (f.includes('diesel')) return t('fuelDiesel');
  if (f.includes('electric') || f.includes('electr')) return t('fuelElectric');
  if (f.includes('hybrid')) return t('fuelHybrid');
  return t('fuel');
}

function formatTransmission(transmission: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!transmission) return null;
  const t_ = transmission.toLowerCase();
  return t_.includes('auto') ? t('transmissionAuto') : t('transmissionManual');
}

export function ListingCard({
  id,
  slug,
  vertical,
  title,
  city,
  country,
  pricePerDay,
  currency = 'EUR',
  photos,
  host,
  seats,
  fuelType,
  transmission,
  createdAt,
  startAt,
  endAt,
  options,
  onCardClick,
}: ListingCardProps) {
  const locale = useLocale();
  const t = useTranslations('listingCard');
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loadingRating, setLoadingRating] = useState(true);

  const basePricePerDay =
    pricePerDay != null
      ? typeof pricePerDay === 'object' && 'toNumber' in pricePerDay
        ? (pricePerDay as { toNumber: () => number }).toNumber()
        : Number(pricePerDay)
      : null;

  // Calculate price if startAt and endAt are provided
  const priceCalculation = useMemo(() => {
    if (!startAt || !endAt || !basePricePerDay) return null;
    
    const listing: ListingForPricing = {
      pricePerDay: basePricePerDay,
      currency,
      options,
    };
    
    return calculateListingPrice(startAt, endAt, listing);
  }, [startAt, endAt, basePricePerDay, currency, options]);
  const photo = photos?.[0] ?? photos?.find((p) => p.order === 0);
  const hostName = host ? [host.firstName, host.lastName].filter(Boolean).join(' ') : null;
  const location = [city, country].filter(Boolean).join(', ');
  const specs = [seats ? `${seats} ${t('seats')}` : null, formatFuel(fuelType, t), formatTransmission(transmission, t)]
    .filter(Boolean)
    .join(' · ');
  const isNew =
    createdAt &&
    (() => {
      const d = new Date(createdAt);
      const now = new Date();
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= NEW_DAYS;
    })();

  // Récupérer les stats de notation
  useEffect(() => {
    let cancelled = false;
    setLoadingRating(true);
    fetch(`${API_URL}/listings/${id}/reviews/stats`)
      .then((r) => (r.ok ? r.json() : { average: 0, count: 0 }))
      .then((stats) => {
        if (!cancelled) {
          setRatingStats(stats);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRatingStats({ average: 0, count: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRating(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const hasRating = ratingStats && ratingStats.count > 0;
  const showNew = !hasRating && isNew;

  const basePath = `/${locale}/${vertical}/${slug ?? id}`;
  const href =
    startAt && endAt
      ? `${basePath}?${new URLSearchParams({ startAt, endAt }).toString()}`
      : basePath;

  const handleClick = (e: React.MouseEvent) => {
    // Appeler le callback si fourni (pour synchroniser la carte)
    // La navigation du Link se fera normalement
    onCardClick?.();
  };

  const deliveryAvailable = options?.delivery?.available === true;

  return (
    <Link href={href} className="group block transition-transform hover:scale-[1.02]" onClick={handleClick}>
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden rounded-lg">
        {photo?.url ? (
          <S3Image
            src={photo.url}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">—</div>
        )}
        {deliveryAvailable && (
          <div className="absolute top-3 left-3 rounded-full bg-[#ff385c] text-white px-3 py-1 text-xs font-medium shadow-md z-10">
            {t('deliveryAvailable') || 'Livraison disponible'}
          </div>
        )}
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow-sm hover:bg-white hover:text-red-500 transition-colors"
          aria-label="Favoris"
          onClick={(e) => e.preventDefault()}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-black text-lg line-clamp-1">{title}</h2>
          {!loadingRating && (
            <div className="flex items-center gap-1 shrink-0">
              {hasRating ? (
                <>
                  <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-black">{ratingStats.average.toFixed(1)}</span>
                </>
              ) : showNew ? (
                <>
                  <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-black">{t('new')}</span>
                </>
              ) : null}
            </div>
          )}
        </div>
        {specs && <p className="mt-1 text-sm text-neutral-600">{specs}</p>}
        {hostName && (
          <p className="mt-2 text-sm text-neutral-600">
            {t('by')} {hostName}
          </p>
        )}
        {location && <p className="mt-0.5 text-sm text-neutral-500">{location}</p>}
        {priceCalculation ? (
          <div className="mt-2">
            {priceCalculation.discount > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <s className="text-sm text-neutral-500 font-normal">
                    {priceCalculation.basePrice.toFixed(2)} {currency}
                  </s>
                  <span className="font-semibold text-black text-lg">
                    {priceCalculation.finalPrice.toFixed(2)} {currency}
                  </span>
                  <span className="text-xs font-medium text-[#ff385c]">
                    -{priceCalculation.discount}% {priceCalculation.discountThreshold ? `J+${priceCalculation.discountThreshold}` : ''}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  {t('total') || 'Total'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-black text-lg">
                  {priceCalculation.finalPrice.toFixed(2)} {currency}
                </p>
                <span className="text-xs text-neutral-500">
                  {t('total') || 'Total'}
                </span>
              </div>
            )}
          </div>
        ) : basePricePerDay != null ? (
          <p className="mt-2 font-semibold text-black text-lg">
            {basePricePerDay} {currency} {t('perDay')}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
