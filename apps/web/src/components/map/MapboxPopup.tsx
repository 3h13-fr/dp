'use client';

import { useState, useEffect } from 'react';
import { Popup } from 'react-map-gl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getListingTitle } from '@/lib/listings';
import { S3Image } from '@/components/S3Image';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  pricePerDay?: unknown;
  currency?: string;
  city?: string | null;
  photos?: Array<{ url: string; order?: number }>;
};

type MapboxPopupProps = {
  listing: Listing;
  longitude: number;
  latitude: number;
  onClose: () => void;
  listingType?: 'CAR_RENTAL' | 'CHAUFFEUR';
};

type RatingStats = { average: number; count: number };

export function MapboxPopup({ listing, longitude, latitude, onClose, listingType = 'CAR_RENTAL' }: MapboxPopupProps) {
  const locale = useLocale();
  const title = getListingTitle(listing);
  const photoUrl = listing.photos?.[0]?.url;
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loadingRating, setLoadingRating] = useState(true);

  const price = listing.pricePerDay
    ? typeof listing.pricePerDay === 'number'
      ? listing.pricePerDay
      : (listing.pricePerDay as { toNumber?: () => number })?.toNumber?.() ?? null
    : null;

  // Déterminer le type de listing pour la route
  const routePath = listingType === 'CHAUFFEUR' ? 'ride' : 'location';
  const href = `/${locale}/${routePath}/${listing.slug ?? listing.id}`;

  // Récupérer les stats de notation
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
    return () => { cancelled = true; };
  }, [listing.id]);

  const hasRating = ratingStats && ratingStats.count > 0;

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
      className="mapbox-popup"
      maxWidth="280px"
    >
      <div className="w-64 rounded-xl overflow-hidden shadow-xl bg-white">
        {photoUrl && (
          <Link href={href} onClick={onClose}>
            <S3Image
              src={photoUrl}
              alt={title}
              className="h-40 w-full object-cover"
            />
          </Link>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base text-black line-clamp-1 flex-1">{title}</h3>
            {!loadingRating && hasRating && (
              <div className="flex items-center gap-1 shrink-0">
                <svg className="h-4 w-4 fill-black" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-black">{ratingStats.average.toFixed(1)}</span>
                {ratingStats.count > 0 && (
                  <span className="text-xs text-gray-600">({ratingStats.count})</span>
                )}
              </div>
            )}
          </div>
          {listing.city && (
            <p className="text-xs text-gray-600 mb-2">{listing.city}</p>
          )}
          {price != null && (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-semibold text-lg text-black">
                {Math.round(price)} {listing.currency || 'EUR'}
              </span>
              <span className="text-sm text-gray-600">/ jour</span>
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
}
