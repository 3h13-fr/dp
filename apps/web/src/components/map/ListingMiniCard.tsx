'use client';

import { Popup } from 'react-map-gl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getListingTitle } from '@/lib/listings';
import { S3Image } from '@/components/S3Image';
import { useEffect, useState, useMemo } from 'react';
import { calculateListingPrice, type ListingForPricing } from '@/lib/pricing';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  pricePerDay?: unknown;
  currency?: string;
  city?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  options?: { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
};

type ListingMiniCardProps = {
  listing: Listing;
  longitude: number;
  latitude: number;
  onClose: () => void;
  listingType?: 'CAR_RENTAL' | 'CHAUFFEUR' | 'MOTORIZED_EXPERIENCE';
  startAt?: string;
  endAt?: string;
};

export function ListingMiniCard({
  listing,
  longitude,
  latitude,
  onClose,
  listingType = 'CAR_RENTAL',
  startAt,
  endAt,
}: ListingMiniCardProps) {
  const locale = useLocale();
  const [ratingStats, setRatingStats] = useState<{ average: number; count: number } | null>(null);
  const [loadingRating, setLoadingRating] = useState(true);

  const title = getListingTitle(listing);
  const photoUrl = listing.photos?.[0]?.url ?? listing.photos?.find((p) => p.order === 0)?.url;
  
  // Get base pricePerDay
  const basePricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'number'
        ? listing.pricePerDay
        : (listing.pricePerDay as { toNumber?: () => number })?.toNumber?.() ?? null
      : null;

  // Calculate price if startAt and endAt are provided
  const priceCalculation = useMemo(() => {
    if (!startAt || !endAt || !basePricePerDay) return null;
    
    const listingForPricing: ListingForPricing = {
      pricePerDay: basePricePerDay,
      currency: listing.currency,
      options: listing.options,
    };
    
    return calculateListingPrice(startAt, endAt, listingForPricing);
  }, [startAt, endAt, basePricePerDay, listing.currency, listing.options]);

  // Determine final price to display
  const displayPrice = priceCalculation?.finalPrice ?? basePricePerDay;
  const hasDiscount = priceCalculation && priceCalculation.discount > 0;

  // Déterminer le type de listing pour la route
  const routePath =
    listingType === 'CHAUFFEUR'
      ? 'ride'
      : listingType === 'MOTORIZED_EXPERIENCE'
        ? 'experience'
        : 'location';
  const href = `/${locale}/${routePath}/${listing.slug ?? listing.id}`;

  // Récupérer les stats de notation
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  useEffect(() => {
    let cancelled = false;
    setLoadingRating(true);
    fetch(`${API_URL}/listings/${listing.id}/reviews/stats`)
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
    return () => {
      cancelled = true;
    };
  }, [listing.id, API_URL]);

  const hasRating = ratingStats && ratingStats.count > 0;

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClose={onClose}
      closeButton={false}
      closeOnClick={true}
      className="mapbox-popup-mini-card"
      maxWidth="280px"
    >
      <div className="w-64">
        {photoUrl && (
          <div className="relative">
            <Link href={href} onClick={onClose} className="block">
              <S3Image
                src={photoUrl}
                alt={title}
                className="h-40 w-full rounded-t-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
            <div className="absolute right-2 top-2 flex gap-1.5 z-10">
              <button
                type="button"
                className="rounded-full bg-white/90 p-2 text-neutral-700 shadow-sm hover:bg-white hover:text-red-500 transition-colors"
                aria-label="Favoris"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-full bg-white/90 p-2 text-neutral-700 shadow-sm hover:bg-white transition-colors"
                aria-label="Fermer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="p-3">
          <Link href={href} onClick={onClose} className="block">
            <h3 className="font-semibold text-sm line-clamp-1 hover:underline">{title}</h3>
          </Link>
          {listing.city && (
            <p className="mt-1 text-xs text-muted-foreground">{listing.city}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            {hasRating && (
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 fill-black" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-medium text-black">
                  {ratingStats.average.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({ratingStats.count})
                </span>
              </div>
            )}
            {displayPrice != null && (
              <div className="text-right">
                {hasDiscount ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-baseline gap-1">
                      <s className="text-xs text-muted-foreground font-normal">
                        {Math.round(priceCalculation!.basePrice)} {listing.currency || 'EUR'}
                      </s>
                      <span className="text-sm font-semibold text-black">
                        {Math.round(displayPrice)} {listing.currency || 'EUR'}
                      </span>
                    </div>
                    <span className="text-xs text-[#ff385c] font-medium">
                      -{priceCalculation!.discount}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {priceCalculation!.isHourly ? 'Total' : 'par jour'}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-black">
                    {Math.round(displayPrice)} {listing.currency || 'EUR'}{' '}
                    {priceCalculation?.isHourly ? 'Total' : '/ jour'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Popup>
  );
}
