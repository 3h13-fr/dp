'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';

type Listing = {
  id: string;
  title?: string | null;
  displayName?: string | null;
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
  const tKyc = useTranslations('kyc');
  const [data, setData] = useState<{ items: Listing[]; total: number } | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/listings/my?limit=50')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => setKycStatus(user?.kycStatus ?? null))
      .catch(() => setKycStatus(null));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('dashboardTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('listingsCount', { count: data.total })}
      </p>
      {kycStatus !== 'APPROVED' && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">{tKyc('requiredToCreateListing')}</p>
          <Link
            href={`/${locale}/profil/kyc?kyc=required`}
            className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            {tKyc('goToKyc')}
          </Link>
        </div>
      )}
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
                  <p className="font-medium">{getListingTitle(listing)}</p>
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
              <div className="flex items-center gap-3">
                <Link
                  href={`/${locale}/host/listings/${listing.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('detail')}
                </Link>
                <Link
                  href={`/${locale}/${listing.type === 'CAR_RENTAL' ? 'location' : listing.type === 'MOTORIZED_EXPERIENCE' ? 'experience' : 'ride'}/${listing.slug ?? listing.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('viewListing')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
