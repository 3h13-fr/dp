'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ReservationModule } from './ReservationModule';
import { ListingCard } from './ListingCard';
import { getListingTitle } from '@/lib/listings';

type Vehicle = {
  modelYear?: number;
  topSpeedKmh?: number | null;
  zeroTo100S?: { toNumber?: () => number } | number | null;
  fuelType?: string | null;
  transmissionType?: string | null;
  make?: { name: string } | null;
  model?: { name: string } | null;
};

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  displayTitle?: string | null;
  description?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  city?: string | null;
  country?: string | null;
  type?: string;
  category?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  seats?: number | null;
  doors?: number | null;
  luggage?: number | null;
  caution?: { toNumber?: () => number } | number | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
  vehicle?: Vehicle | null;
};

type LocationDetailContentProps = {
  listing: Listing;
  similarListings?: Listing[];
  vertical?: 'location' | 'ride';
};

function formatFuel(fuelType: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!fuelType) return null;
  const f = fuelType.toLowerCase();
  if (f.includes('diesel')) return t('fuelDiesel');
  if (f.includes('electric') || f.includes('electr')) return t('fuelElectric');
  if (f.includes('hybrid')) return t('fuelHybrid');
  return t('fuel');
}
function formatTransmission(trans: string | null | undefined, t: ReturnType<typeof useTranslations<'listingCard'>>) {
  if (!trans) return null;
  return trans.toLowerCase().includes('auto') ? t('transmissionAuto') : t('transmissionManual');
}

const FEATURE_KEYS = [
  'heatedSeats', 'usbPort', 'bluetooth', 'keylessEntry', 'sunroof',
  'parkAssist', 'rearCamera', 'androidAuto', 'appleCarPlay', 'gps', 'airConditioning',
] as const;

export function LocationDetailContent({ listing, similarListings = [], vertical = 'location' }: LocationDetailContentProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('listing');
  const tCard = useTranslations('listingCard');
  const tCat = useTranslations('categories');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const photos = listing.photos?.length
    ? [...listing.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const mainPhoto = photos[galleryIndex] ?? photos[0];
  const thumbnails = photos.slice(0, 5);
  const hostName = [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') || '—';
  const categoryLabel = listing.category ? tCat(listing.category as 'city' | 'economy' | 'suv' | 'luxury' | 'electric' | 'convertible' | 'sport' | 'family' | 'van' | 'new' | 'collection') : null;
  const fuelSource = listing.vehicle?.fuelType ?? listing.fuelType;
  const transSource = listing.vehicle?.transmissionType ?? listing.transmission;
  const fuelLabel = formatFuel(fuelSource, tCard);
  const transLabel = formatTransmission(transSource, tCard);
  const vehicle = listing.vehicle;
  const zeroTo100 = vehicle?.zeroTo100S != null
    ? (typeof vehicle.zeroTo100S === 'object' && typeof vehicle.zeroTo100S.toNumber === 'function'
        ? vehicle.zeroTo100S.toNumber()
        : Number(vehicle.zeroTo100S))
    : null;
  const cautionNum = listing.caution != null
    ? (typeof listing.caution === 'object' && typeof listing.caution.toNumber === 'function'
        ? listing.caution.toNumber()
        : Number(listing.caution))
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      {/* Back + gallery */}
      <div className="mb-4 flex items-center gap-3 md:mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gray-light)] bg-white text-[var(--color-gray-dark)] hover:bg-[var(--color-gray-bg)]"
          aria-label="Back"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Gallery */}
      <div className="overflow-hidden rounded-2xl bg-[var(--color-gray-bg)]">
        {mainPhoto?.url ? (
          <div className="relative aspect-[16/10] w-full">
            <img
              src={mainPhoto.url}
              alt={getListingTitle(listing)}
              className="h-full w-full object-cover"
            />
            {thumbnails.length > 1 && (
              <>
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto pb-1">
                  {thumbnails.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === galleryIndex ? 'border-[var(--color-primary)]' : 'border-white'
                      }`}
                    >
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 md:bottom-4">
                  {photos.slice(0, 5).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i === galleryIndex ? 'bg-white' : 'bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="absolute right-3 top-3 flex gap-2 md:right-4 md:top-4">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-gray-dark)] shadow" aria-label="Share">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-gray-dark)] shadow" aria-label="Favorite">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center text-[var(--color-gray)]">
            {t('noImage')}
          </div>
        )}
      </div>

      {/* Title, location, rating */}
      <div className="mt-6 border-b border-[var(--color-gray-light)] pb-6">
        <h1 className="text-2xl font-bold text-[var(--color-black)] md:text-3xl">{getListingTitle(listing)}</h1>
        {(listing.city || listing.country) && (
          <p className="mt-1 text-[var(--color-gray)]">
            {[listing.city, listing.country].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-gray)]">
          <span className="inline-flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            {t('noReviews')}
          </span>
        </div>
        {/* Badges: year, category, passengers, doors, luggage */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {vehicle?.modelYear != null && (
            <span className="rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
              {vehicle.modelYear}
            </span>
          )}
          {categoryLabel && (
            <span className="rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
              {categoryLabel}
            </span>
          )}
          {listing.seats != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {listing.seats} {t('passengers')}
            </span>
          )}
          {listing.doors != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              {listing.doors} {t('doors')}
            </span>
          )}
          {listing.luggage != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              {listing.luggage} {t('luggage')}
            </span>
          )}
        </div>
      </div>

      {/* Two-column: content | reservation */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="min-w-0 flex-1">
          {/* Conditions / offers */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <ul className="space-y-3 text-sm text-[var(--color-gray-dark)]">
              <li className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-primary)]">{t('discountPercent')}</span>
                <span className="text-[var(--color-gray)]">— {t('discountFromDays')}</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {t('minAgeLicense')}
              </li>
              {vertical === 'location' && cautionNum != null && cautionNum > 0 && (
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  {t('deposit')} {cautionNum.toLocaleString()}€
                </li>
              )}
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                {t('dailyDistance')} 100 km
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                {t('insuranceIncluded')}
              </li>
            </ul>
          </section>

          {/* Owner + description */}
          {listing.host && (
            <div className="flex items-center gap-4 border-b border-[var(--color-gray-light)] py-6">
              {listing.host.avatarUrl ? (
                <img src={listing.host.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-gray-light)] text-lg font-semibold text-[var(--color-gray)]">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-[var(--color-black)]">
                  {t('owner')}: {hostName}
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white" title="Verified">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                </p>
                <p className="text-sm text-[var(--color-gray)]">5.0 · 100% response rate</p>
              </div>
            </div>
          )}

          {listing.description && (
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <p className="whitespace-pre-wrap text-[var(--color-gray-dark)]">
                {descriptionExpanded ? listing.description : listing.description.slice(0, 300)}
                {listing.description.length > 300 && !descriptionExpanded && '…'}
              </p>
              {listing.description.length > 300 && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(true)}
                  className="mt-2 text-sm font-medium text-[var(--color-black)] underline"
                >
                  {t('seeMore')}
                </button>
              )}
            </section>
          )}

          {/* Spécificités du véhicule */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('vehicleSpecs')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {vehicle?.topSpeedKmh != null && (
                <div>
                  <p className="text-[var(--color-gray)]">{t('maxSpeed')}</p>
                  <p className="font-medium text-[var(--color-gray-dark)]">{vehicle.topSpeedKmh} km/h</p>
                </div>
              )}
              {zeroTo100 != null && (
                <div>
                  <p className="text-[var(--color-gray)]">{t('acceleration')}</p>
                  <p className="font-medium text-[var(--color-gray-dark)]">{zeroTo100} s (0-100 km/h)</p>
                </div>
              )}
              {transLabel && (
                <div>
                  <p className="text-[var(--color-gray)]">{t('transmission')}</p>
                  <p className="font-medium text-[var(--color-gray-dark)]">{transLabel}</p>
                </div>
              )}
              {fuelLabel && (
                <div>
                  <p className="text-[var(--color-gray)]">{t('fuel')}</p>
                  <p className="font-medium text-[var(--color-gray-dark)]">{fuelLabel}</p>
                </div>
              )}
              {listing.seats != null && (
                <div>
                  <p className="text-[var(--color-gray)]">{t('seats')}</p>
                  <p className="font-medium text-[var(--color-gray-dark)]">{listing.seats}</p>
                </div>
              )}
              <div>
                <p className="text-[var(--color-gray)]">{t('mileage')}</p>
                <p className="font-medium text-[var(--color-gray-dark)]">{t('unlimited')}</p>
              </div>
            </div>
          </section>

          {/* Règlement du véhicule */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('vehicleRules')}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-gray-dark)]">
              <li className="flex items-center gap-2">{t('returnClean')}</li>
              <li className="flex items-center gap-2">{t('fullTank')}</li>
              <li className="flex items-center gap-2">{t('nonSmoking')}</li>
            </ul>
          </section>

          {/* Ce que propose ce véhicule */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('whatVehicleOffers')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm text-[var(--color-gray-dark)] sm:grid-cols-3">
              {FEATURE_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-gray-bg)] text-[var(--color-gray)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {t(key)}
                </div>
              ))}
            </div>
          </section>

          {/* Options et services */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('optionsAndServices')}</h2>
            <p className="mt-2 text-sm text-[var(--color-gray-dark)]">{t('additionalDriver')} — 1€ / jour</p>
          </section>

          {/* Map placeholder */}
          <section className="border-b border-[var(--color-gray-light)] py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('whereIsVehicle')}</h2>
            <p className="mt-2 text-sm text-[var(--color-gray)]">{[listing.city, listing.country].filter(Boolean).join(', ')}</p>
            <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-[var(--color-gray-bg)] text-[var(--color-gray)]">
              Map placeholder
            </div>
          </section>

          {/* Commentaires */}
          <section className="py-6">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('noComments')}</h2>
          </section>

          {/* Similar vehicles (location only) */}
          {vertical === 'location' && similarListings.length > 0 && (
            <section className="border-t border-[var(--color-gray-light)] py-8">
              <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('similarVehicles')}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {similarListings.filter((l) => l.id !== listing.id).slice(0, 3).map((item) => (
                  <ListingCard
                    key={item.id}
                    id={item.id}
                    slug={item.slug}
                    vertical="location"
                    title={getListingTitle(item)}
                    city={item.city}
                    country={item.country}
                    pricePerDay={item.pricePerDay}
                    currency={item.currency}
                    photos={item.photos}
                    host={item.host}
                    seats={item.seats}
                    fuelType={item.fuelType}
                    transmission={item.transmission}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:w-[380px] lg:shrink-0">
          <div className="sticky top-24">
            <ReservationModule listing={listing} vertical={vertical} />
          </div>
        </aside>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-[var(--color-gray-light)] bg-white px-4 py-3 shadow-[var(--shadow-dropdown)] lg:hidden">
        <div>
          <p className="text-lg font-semibold text-[var(--color-black)]">
            {listing.pricePerDay != null
              ? `${typeof listing.pricePerDay === 'object' && typeof (listing.pricePerDay as { toNumber?: () => number }).toNumber === 'function'
                  ? (listing.pricePerDay as { toNumber: () => number }).toNumber()
                  : Number(listing.pricePerDay)} ${listing.currency ?? 'EUR'}`
              : '—'}{' '}
            {t('perDay')}
          </p>
          <p className="text-xs text-[var(--color-gray)]">{t('taxesIncluded')}</p>
        </div>
        <Link
          href={`/${locale}/${vertical}/${listing.slug ?? listing.id}/checkout`}
          className="rounded-ds-button bg-[var(--color-black)] px-6 py-3 font-semibold text-white hover:opacity-90"
          data-testid="listing-book-link-mobile"
        >
          {vertical === 'ride' ? t('reservationRequest') : t('reserve')}
        </Link>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
  );
}
