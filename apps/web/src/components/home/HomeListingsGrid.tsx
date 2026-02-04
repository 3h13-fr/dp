'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ListingCard } from '@/components/listings/ListingCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ListingItem = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  type?: string;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null } | null;
  seats?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  createdAt?: string;
};

export function HomeListingsGrid() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [items, setItems] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get('category') ?? '';
  const city = searchParams.get('city') ?? '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('type', 'CAR_RENTAL');
    params.set('limit', '12');
    if (city.trim()) params.set('city', city.trim());
    if (category && category !== 'new') params.set('category', category);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch(`${API_URL}/listings?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
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
  }, [category, city]);

  if (loading) {
    return <p className="py-12 text-center text-neutral-500">{t('common.loading')}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-neutral-500">
        {t('listings.noResults')}
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-neutral-500">
        {t('listings.found', { count: total })}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
