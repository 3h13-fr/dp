'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ListingCard } from '@/components/listings/ListingCard';
import { getListingTitle } from '@/lib/listings';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ListingTypeParam = 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';

type ListingItem = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  city?: string | null;
  country?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  type?: string;
  photos?: Array<{ url: string; order?: number }>;
  durationMinutes?: number | null;
  host?: { id: string; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null } | null;
  seats?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  createdAt?: string;
  options?: { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
};

const VERTICAL_BY_TYPE: Record<ListingTypeParam, 'location' | 'experience' | 'ride'> = {
  CAR_RENTAL: 'location',
  MOTORIZED_EXPERIENCE: 'experience',
  CHAUFFEUR: 'ride',
};

type ListingsGridProps = {
  /** When set, only listings of this type are fetched and type is fixed in the API call. */
  listingType?: ListingTypeParam;
  /** ID du listing sélectionné pour highlight */
  selectedListingId?: string | null;
  /** Callback appelé au hover sur un listing (desktop) */
  onListingHover?: (listingId: string | null) => void;
  /** Callback appelé au clic sur un listing */
  onListingClick?: (listingId: string) => void;
  /** Listings externes à afficher (si fournis, surcharge la requête interne) */
  listings?: ListingItem[];
};

export function ListingsGrid({
  listingType,
  selectedListingId,
  onListingHover,
  onListingClick,
  listings: externalListings,
}: ListingsGridProps = {}) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [items, setItems] = useState<ListingItem[]>(externalListings || []);
  const [total, setTotal] = useState(externalListings?.length || 0);
  const [loading, setLoading] = useState(!externalListings);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  const startAt = searchParams.get('startAt') ?? '';
  const endAt = searchParams.get('endAt') ?? '';
  const queryString = [
    listingType,
    searchParams.get('city') ?? searchParams.get('q'),
    searchParams.get('country'),
    searchParams.get('category'),
    searchParams.get('transmission'),
    searchParams.get('fuelType'),
    searchParams.get('sortBy'),
    searchParams.get('lat'),
    searchParams.get('lng'),
    searchParams.get('radius'),
    startAt,
    endAt,
  ].filter(Boolean).join(',');

  useEffect(() => {
    // Si des listings externes sont fournis, les utiliser directement
    if (externalListings) {
      setItems(externalListings);
      setTotal(externalListings.length);
      setLoading(false);
      return;
    }

    // Sinon, faire la requête comme avant
    setLoading(true);
    const params = new URLSearchParams();
    if (listingType) params.set('type', listingType);
    
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const hasCoords = lat && lng;
    
    // Ne pas envoyer city à l'API si on a des coordonnées géographiques précises
    // Le filtrage par rayon géographique est plus fiable que le filtrage par nom de ville
    const city = searchParams.get('city') ?? searchParams.get('q') ?? '';
    if (city.trim() && !hasCoords) {
      params.set('city', city.trim());
    }
    
    const country = searchParams.get('country');
    if (country?.trim()) params.set('country', country.trim());
    const category = searchParams.get('category');
    if (category?.trim()) params.set('category', category.trim());
    const transmission = searchParams.get('transmission');
    if (transmission?.trim()) params.set('transmission', transmission.trim());
    const fuelType = searchParams.get('fuelType');
    if (fuelType?.trim()) params.set('fuelType', fuelType.trim());
    const sortBy = searchParams.get('sortBy');
    if (sortBy?.trim()) params.set('sortBy', sortBy.trim());
    
    if (hasCoords) {
      params.set('lat', lat);
      params.set('lng', lng);
      if (radius) params.set('radius', radius);
    }
    params.set('limit', '24');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    fetch(`${API_URL}/listings?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : { items: [], total: 0 })
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [listingType, queryString, externalListings]);

  // Scroll vers le listing sélectionné (mobile)
  useEffect(() => {
    if (selectedListingId && selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedListingId]);

  if (loading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-muted-foreground">
        {t('listings.noResults')}
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {t('listings.found', { count: total })}
      </p>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {items.map((listing) => (
          <div
            key={listing.id}
            ref={selectedListingId === listing.id ? selectedCardRef : null}
            className={selectedListingId === listing.id ? 'ring-2 ring-[#ff385c] ring-offset-2 rounded-lg' : ''}
            onMouseEnter={() => onListingHover?.(listing.id)}
            onMouseLeave={() => onListingHover?.(null)}
          >
            <ListingCard
              id={listing.id}
              slug={listing.slug}
              vertical={VERTICAL_BY_TYPE[listingType ?? (listing.type as ListingTypeParam)] ?? 'location'}
              title={getListingTitle(listing)}
              city={listing.city}
              country={listing.country}
              pricePerDay={listing.pricePerDay}
              currency={listing.currency}
              photos={listing.photos}
              host={listing.host}
              seats={listing.seats}
              fuelType={listing.fuelType}
              transmission={listing.transmission}
              createdAt={listing.createdAt}
              startAt={startAt || undefined}
              endAt={endAt || undefined}
              options={listing.options}
              onCardClick={() => onListingClick?.(listing.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
