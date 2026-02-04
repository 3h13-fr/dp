'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

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
};

export function ListingsGrid() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const q = searchParams.get('q') ?? '';
  const [items, setItems] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('city', q.trim());
    params.set('limit', '24');
    fetch(`${API_URL}/listings?${params.toString()}`)
      .then((res) => res.ok ? res.json() : { items: [], total: 0 })
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [q]);

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
        {items.map((listing) => {
          const price = listing.pricePerDay != null
            ? (typeof listing.pricePerDay === 'object' && typeof (listing.pricePerDay as { toNumber?: () => number }).toNumber === 'function'
                ? (listing.pricePerDay as { toNumber: () => number }).toNumber()
                : Number(listing.pricePerDay))
            : null;
          const photo = listing.photos?.[0] ?? listing.photos?.find((p) => p.order === 0);
          return (
            <Link
              key={listing.id}
              href={`/${locale}/listings/${listing.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-background transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-muted">
                {photo?.url ? (
                  <img
                    src={photo.url}
                    alt={listing.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    {t('listing.noImage')}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold line-clamp-1">{listing.title}</h2>
                {(listing.city || listing.country) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[listing.city, listing.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {price != null && (
                  <p className="mt-2 font-medium">
                    {price} {listing.currency ?? 'EUR'} {t('listing.perDay')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
