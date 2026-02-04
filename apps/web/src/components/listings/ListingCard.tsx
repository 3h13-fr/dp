'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type ListingCardProps = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  pricePerDay?: number | { toNumber: () => number } | null;
  currency?: string;
  photos?: Array<{ url: string; order?: number }>;
  host?: { firstName?: string | null; lastName?: string | null } | null;
  seats?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  createdAt?: string;
};

const NEW_DAYS = 14;

function formatFuel(fuelType: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!fuelType) return null;
  const f = fuelType.toLowerCase();
  if (f.includes('diesel')) return t('fuelDiesel');
  if (f.includes('electric') || f.includes('electr')) return t('fuelElectric');
  if (f.includes('hybrid')) return t('fuelHybrid');
  return t('fuel');
}

function formatTransmission(transmission: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!transmission) return null;
  const t_ = transmission.toLowerCase();
  return t_.includes('auto') ? t('transmissionAuto') : t('transmissionManual');
}

export function ListingCard({
  id,
  title,
  city,
  country,
  pricePerDay,
  currency = 'EUR',
  photos,
  host,
  seats,
  fuelType,
  transmission,
  createdAt,
}: ListingCardProps) {
  const locale = useLocale();
  const t = useTranslations('listingCard');
  const price =
    pricePerDay != null
      ? typeof pricePerDay === 'object' && 'toNumber' in pricePerDay
        ? (pricePerDay as { toNumber: () => number }).toNumber()
        : Number(pricePerDay)
      : null;
  const photo = photos?.[0] ?? photos?.find((p) => p.order === 0);
  const hostName = host ? [host.firstName, host.lastName].filter(Boolean).join(' ') : null;
  const location = [city, country].filter(Boolean).join(', ');
  const specs = [seats ? `${seats} ${t('seats')}` : null, formatFuel(fuelType, t), formatTransmission(transmission, t)]
    .filter(Boolean)
    .join(' · ');
  const isNew =
    createdAt &&
    (() => {
      const d = new Date(createdAt);
      const now = new Date();
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= NEW_DAYS;
    })();

  return (
    <Link
      href={`/${locale}/listings/${id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-neutral-100">
        {photo?.url ? (
          <img
            src={photo.url}
            alt={title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">—</div>
        )}
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow hover:bg-white hover:text-red-500"
          aria-label="Favoris"
          onClick={(e) => e.preventDefault()}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {isNew && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs font-medium text-neutral-800">
            <span className="text-amber-500">★</span> {t('new')}
          </span>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-neutral-900 line-clamp-1">{title}</h2>
        {specs && <p className="mt-1 text-sm text-neutral-600">{specs}</p>}
        {hostName && (
          <p className="mt-2 text-sm text-neutral-600">
            {t('by')} {hostName}
          </p>
        )}
        {location && <p className="mt-0.5 text-sm text-neutral-500">{location}</p>}
        {price != null && (
          <p className="mt-2 font-semibold text-neutral-900">
            {price} {currency} {t('perDay')}
          </p>
        )}
      </div>
    </Link>
  );
}
