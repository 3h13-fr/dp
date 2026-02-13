'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getListingTitle, getListingCountryCode } from '@/lib/listings';
import { useActiveMarkets } from '@/hooks/useActiveMarketCountryCodes';
import { ListingReviews, ListingReviewsSection } from './ListingReviews';
import { S3Image } from '@/components/S3Image';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  description?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  city?: string | null;
  country?: string | null;
  type?: string;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
  cityRef?: { country?: { code?: string } } | null;
};

export function ListingDetail({ listing, vertical = 'location' }: { listing: Listing; vertical?: 'location' | 'experience' | 'ride' }) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const { bookingsAllowedCountryCodes } = useActiveMarkets();
  const listingCountryCode = getListingCountryCode(listing);
  const canBook = listingCountryCode != null && bookingsAllowedCountryCodes.includes(listingCountryCode);
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
          <S3Image
            src={photo.url}
            alt={getListingTitle(listing)}
            className="h-80 w-full object-cover"
          />
        ) : (
          <div className="flex h-80 w-full items-center justify-center text-muted-foreground">
            {t('noImage')}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-bold">{getListingTitle(listing)}</h1>
        {(listing.city || listing.country) && (
          <p className="mt-1 text-muted-foreground">
            {[listing.city, listing.country].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="mt-2">
          <ListingReviews listingId={listing.id} />
        </div>
      </div>
      {listing.description && (
        <p className="whitespace-pre-wrap text-foreground">{listing.description}</p>
      )}
      <ListingReviewsSection listingId={listing.id} />
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
        {canBook ? (
          <Link
            href={`/${locale}/${vertical}/${listing.slug ?? listing.id}/checkout`}
            className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            data-testid="listing-book-link"
          >
            {t('book')}
          </Link>
        ) : (
          <span
            className="inline-block cursor-not-allowed rounded-lg bg-muted px-6 py-3 font-medium text-muted-foreground opacity-70"
            data-testid="listing-book-link-disabled"
          >
            {t('reservationsUnavailable')}
          </span>
        )}
      </div>
    </article>
  );
}
