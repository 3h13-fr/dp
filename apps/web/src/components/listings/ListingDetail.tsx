'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  city?: string | null;
  country?: string | null;
  type?: string;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
};

export function ListingDetail({ listing }: { listing: Listing }) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const price = listing.pricePerDay != null
    ? (typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay))
    : null;
  const photo = listing.photos?.[0] ?? listing.photos?.find((p) => p.order === 0);

  return (
    <article className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-muted">
        {photo?.url ? (
          <img
            src={photo.url}
            alt={listing.title}
            className="h-80 w-full object-cover"
          />
        ) : (
          <div className="flex h-80 w-full items-center justify-center text-muted-foreground">
            {t('noImage')}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-bold">{listing.title}</h1>
        {(listing.city || listing.country) && (
          <p className="mt-1 text-muted-foreground">
            {[listing.city, listing.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
      {listing.description && (
        <p className="whitespace-pre-wrap text-foreground">{listing.description}</p>
      )}
      {listing.host && (
        <p className="text-sm text-muted-foreground">
          {t('host')}: {[listing.host.firstName, listing.host.lastName].filter(Boolean).join(' ') || '—'}
        </p>
      )}
      {price != null && (
        <p className="text-lg font-semibold">
          {price} {listing.currency ?? 'EUR'} {t('perDay')}
        </p>
      )}
      <div>
        <Link
          href={`/${locale}/listings/${listing.id}/checkout`}
          className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
        >
          {t('book')}
        </Link>
      </div>
    </article>
  );
}
