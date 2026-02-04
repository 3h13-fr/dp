'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type Listing = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  city: string | null;
  country: string | null;
  pricePerDay: unknown;
  currency: string;
  photos: { url: string; order: number }[];
};

export default function HostDashboardPage() {
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const [data, setData] = useState<{ items: Listing[]; total: number } | null>(null);

  useEffect(() => {
    apiFetch('/listings/my?limit=50')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('dashboardTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('listingsCount', { count: data.total })}
      </p>
      {data.items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t('noListings')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.items.map((listing) => (
            <li
              key={listing.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex gap-4">
                {listing.photos?.[0]?.url ? (
                  <img
                    src={listing.photos[0].url}
                    alt=""
                    className="h-16 w-24 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-24 rounded bg-muted" />
                )}
                <div>
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.type} · {listing.status}
                    {listing.city && ` · ${listing.city}`}
                  </p>
                  {listing.pricePerDay != null && (
                    <p className="text-sm">
                      {String(listing.pricePerDay)} {listing.currency} / day
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/${locale}/listings/${listing.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('viewListing')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
