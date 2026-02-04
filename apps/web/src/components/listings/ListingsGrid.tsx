'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ListingCard } from '@/components/listings/ListingCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ListingTypeParam = 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';

type ListingItem = {
  id: string;
  title: string;
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
};

type ListingsGridProps = {
  /** When set, only listings of this type are fetched and type is fixed in the API call. */
  listingType?: ListingTypeParam;
};

export function ListingsGrid({ listingType }: ListingsGridProps = {}) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [items, setItems] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const queryString = [
    listingType,
    searchParams.get('city') ?? searchParams.get('q'),
    searchParams.get('country'),
    searchParams.get('category'),
    searchParams.get('lat'),
    searchParams.get('lng'),
    searchParams.get('radius'),
  ].filter(Boolean).join(',');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (listingType) params.set('type', listingType);
    const city = searchParams.get('city') ?? searchParams.get('q') ?? '';
    if (city.trim()) params.set('city', city.trim());
    const country = searchParams.get('country');
    if (country?.trim()) params.set('country', country.trim());
    const category = searchParams.get('category');
    if (category?.trim()) params.set('category', category.trim());
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    if (lat && lng) {
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
  }, [listingType, queryString]);

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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((listing) => (
          <ListingCard
            key={listing.id}
            id={listing.id}
            title={listing.title}
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
          />
        ))}
      </div>
    </>
  );
}
