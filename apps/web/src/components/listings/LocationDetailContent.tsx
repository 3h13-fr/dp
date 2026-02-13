'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ReservationModule } from './ReservationModule';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { ListingCard } from './ListingCard';
import { ListingReviews, ListingReviewsSection } from './ListingReviews';
import { ListingDetailOverlayHeader } from './ListingDetailOverlayHeader';
import { ListingImageGallery } from './ListingImageGallery';
import { ListingStickyBottomBar } from './ListingStickyBottomBar';
import { ListingLocationMap } from './ListingLocationMap';
import { getListingTitle, getListingCountryCode } from '@/lib/listings';
import { calculateListingPrice, type ListingForPricing } from '@/lib/pricing';
import { useActiveMarkets } from '@/hooks/useActiveMarketCountryCodes';

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
  latitude?: number | null;
  longitude?: number | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  vehicle?: Vehicle | null;
  minDriverAge?: number | null;
  minLicenseYears?: number | null;
  options?: {
    pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null };
    usageConditions?: { maxMileagePerDay?: number | null; excessMileagePricePerKm?: number | null };
    insurance?: { policyIds?: string[]; policies?: Array<{ id: string; name: string; eligibilityCriteria?: { minDriverAge?: number | null; minLicenseYears?: number | null } }> };
  } | null;
  region?: string | null;
  cityRef?: {
    id: string;
    slug: string;
    name: unknown;
    region?: { id: string; slug: string; name: unknown } | null;
    country?: { code?: string } | null;
  } | null;
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
  'heatedSeats',
  'usbPort',
  'bluetooth',
  'keylessEntry',
  'sunroof',
  'parkAssist',
  'rearCamera',
  'androidAuto',
  'appleCarPlay',
  'gps',
  'airConditioning',
] as const;

export function LocationDetailContent({
  listing,
  similarListings = [],
  vertical = 'location',
}: LocationDetailContentProps) {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const { bookingsAllowedCountryCodes } = useActiveMarkets();
  const listingCountryCode = getListingCountryCode(listing);
  const canBook = listingCountryCode != null && bookingsAllowedCountryCodes.includes(listingCountryCode);

  const urlStartAt = searchParams.get('startAt') ?? '';
  const urlEndAt = searchParams.get('endAt') ?? '';
  const t = useTranslations('listing');
  const tCard = useTranslations('listingCard');
  const tCat = useTranslations('categories');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const photos = listing.photos?.length
    ? [...listing.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const hostName = [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') || '—';

  const localeKey = locale.startsWith('fr') ? 'fr' : 'en';
  const getLocalizedName = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    return (o[localeKey] ?? o.en ?? o.fr ?? Object.values(o)[0]) as string ?? null;
  };
  const cityName = listing.cityRef ? getLocalizedName(listing.cityRef.name) : null;
  const regionName = listing.cityRef?.region ? getLocalizedName(listing.cityRef.region.name) : null;
  const locationParts = [cityName ?? listing.city, regionName ?? listing.region, listing.country].filter(Boolean);
  const categoryLabel = listing.category
    ? tCat(
        listing.category as
          | 'city'
          | 'economy'
          | 'suv'
          | 'luxury'
          | 'electric'
          | 'convertible'
          | 'sport'
          | 'family'
          | 'van'
          | 'new'
          | 'collection',
      )
    : null;
  const fuelSource = listing.vehicle?.fuelType ?? listing.fuelType;
  const transSource = listing.vehicle?.transmissionType ?? listing.transmission;
  const fuelLabel = formatFuel(fuelSource, tCard);
  const transLabel = formatTransmission(transSource, tCard);
  const vehicle = listing.vehicle;
  const zeroTo100 =
    vehicle?.zeroTo100S != null
      ? typeof vehicle.zeroTo100S === 'object' && typeof vehicle.zeroTo100S.toNumber === 'function'
        ? vehicle.zeroTo100S.toNumber()
        : Number(vehicle.zeroTo100S)
      : null;
  const cautionNum =
    listing.caution != null
      ? typeof listing.caution === 'object' && typeof listing.caution.toNumber === 'function'
        ? listing.caution.toNumber()
        : Number(listing.caution)
      : null;

  const pricing = listing.options?.pricing;
  const usageConditions = listing.options?.usageConditions;
  const discount3 = pricing?.durationDiscount3Days != null ? Number(pricing.durationDiscount3Days) : null;
  const discount7 = pricing?.durationDiscount7Days != null ? Number(pricing.durationDiscount7Days) : null;
  const discount30 = pricing?.durationDiscount30Days != null ? Number(pricing.durationDiscount30Days) : null;
  const hasDiscount3 = discount3 != null && discount3 > 0;
  const hasDiscount7 = discount7 != null && discount7 > 0;
  const hasDiscount30 = discount30 != null && discount30 > 0;
  const discountPercent = hasDiscount3 ? discount3! : hasDiscount7 ? discount7! : hasDiscount30 ? discount30! : null;
  const discountDays = hasDiscount3 ? 3 : hasDiscount7 ? 7 : hasDiscount30 ? 30 : null;
  const firstPolicyCriteria = listing.options?.insurance?.policies?.[0]?.eligibilityCriteria as { minDriverAge?: number | null; minLicenseYears?: number | null } | undefined;
  const minDriverAge = listing.minDriverAge ?? firstPolicyCriteria?.minDriverAge ?? 21;
  const minLicenseYears = listing.minLicenseYears ?? firstPolicyCriteria?.minLicenseYears ?? 2;
  const maxMileagePerDay = usageConditions?.maxMileagePerDay != null ? Number(usageConditions.maxMileagePerDay) : null;
  const excessMileagePrice = usageConditions?.excessMileagePricePerKm != null ? Number(usageConditions.excessMileagePricePerKm) : null;

  // Calculate total price for sticky bottom bar
  const pricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay)
      : null;

  const priceCalculation = useMemo(() => {
    if (!urlStartAt || !urlEndAt) return null;
    
    const listingForPricing: ListingForPricing = {
      pricePerDay: listing.pricePerDay,
      currency: listing.currency,
      options: listing.options,
    };
    
    return calculateListingPrice(urlStartAt, urlEndAt, listingForPricing);
  }, [urlStartAt, urlEndAt, listing.pricePerDay, listing.currency, listing.options]);

  const totalPrice = priceCalculation?.finalPrice;

  return (
    <div className="relative min-h-screen">
      {/* Mobile Overlay Header */}
      <ListingDetailOverlayHeader
        listingId={listing.id}
        isFavorite={isFavorite}
        onFavoriteToggle={() => setIsFavorite(!isFavorite)}
      />

      {/* Image Gallery - Full width, no padding on mobile */}
      <div className="w-full md:pt-8">
        <ListingImageGallery photos={photos} alt={getListingTitle(listing)} />
      </div>

      {/* Main Content Container */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Title, location, rating - Mobile first */}
        <div className="mt-6 border-b border-[var(--color-gray-light)] pb-6 md:mt-8">
          <h1 className="text-2xl font-bold text-[var(--color-black)] md:text-3xl">
            {getListingTitle(listing)}
          </h1>
          {locationParts.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-[var(--color-gray)]">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationParts.join(', ')}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-gray)]">
            <ListingReviews listingId={listing.id} />
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
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {listing.seats} {t('passengers')}
              </span>
            )}
            {listing.doors != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                {listing.doors} {t('doors')}
              </span>
            )}
            {listing.luggage != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gray-bg)] px-3 py-1.5 font-medium text-[var(--color-gray-dark)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                {listing.luggage} {t('luggage')}
              </span>
            )}
          </div>
        </div>

        {/* Two-column layout: content | reservation (desktop) */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Left column: Content */}
          <div className="min-w-0 flex-1">
            {/* Conditions / offers */}
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <ul className="space-y-4">
                {discountPercent != null && discountPercent > 0 && discountDays != null && (
                  <li className="flex items-start gap-4 py-4">
                    <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-[var(--color-gray-dark)]">{t('discountPercent', { percent: Math.round(discountPercent) })}</p>
                      <p className="mt-0.5 text-sm text-[var(--color-gray)]">
                        {discountDays === 3 && t('discountFrom3Days')}
                        {discountDays === 7 && t('discountFrom7Days')}
                        {discountDays === 30 && t('discountFrom30Days')}
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-4 py-4">
                  <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--color-gray-dark)]">
                      {minLicenseYears === 1 ? t('minAgeLicenseYear', { age: minDriverAge, years: minLicenseYears }) : t('minAgeLicenseYears', { age: minDriverAge, years: minLicenseYears })}
                    </p>
                  </div>
                </li>
                {vertical === 'location' && cautionNum != null && cautionNum > 0 && (
                  <li className="flex items-start gap-4 py-4">
                    <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-[var(--color-gray-dark)]">{t('depositAmount', { amount: `${cautionNum.toLocaleString('fr-FR')} €` })}</p>
                      <p className="mt-0.5 text-sm text-[var(--color-gray)]">{t('depositSubtext')}</p>
                    </div>
                  </li>
                )}
                {vertical === 'location' && (
                  <li className="flex items-start gap-4 py-4">
                    <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <div>
                      <p className="font-semibold text-[var(--color-gray-dark)]">
                        {t('dailyDistanceKm', { km: maxMileagePerDay ?? 200 })}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--color-gray)]">
                        {t('dailyDistanceExtraKm', { price: excessMileagePrice != null && excessMileagePrice > 0 ? `${excessMileagePrice.toLocaleString('fr-FR')} €` : '2 €' })}
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-4 py-4">
                  <svg className="h-5 w-5 shrink-0 text-[var(--color-gray)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--color-gray-dark)]">{t('insuranceIncluded')}</p>
                  </div>
                </li>
              </ul>
            </section>

            {/* Owner + description */}
            {listing.host && (
              <div className="flex items-center gap-4 border-b border-[var(--color-gray-light)] py-6">
                {listing.host.avatarUrl ? (
                  <img
                    src={listing.host.avatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-gray-light)] text-lg font-semibold text-[var(--color-gray)]">
                    {hostName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--color-black)]">
                    {t('owner')}: {hostName}
                    <span
                      className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                      title="Verified"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
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

            <ListingReviewsSection listingId={listing.id} />

            {/* Vehicle specifications */}
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
                    <p className="font-medium text-[var(--color-gray-dark)]">
                      {zeroTo100} s (0-100 km/h)
                    </p>
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

            {/* Vehicle rules */}
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('vehicleRules')}</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-gray-dark)]">
                <li className="flex items-center gap-2">{t('returnClean')}</li>
                <li className="flex items-center gap-2">{t('fullTank')}</li>
                <li className="flex items-center gap-2">{t('nonSmoking')}</li>
              </ul>
            </section>

            {/* Vehicle features */}
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('whatVehicleOffers')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm text-[var(--color-gray-dark)] sm:grid-cols-3">
                {FEATURE_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-gray-bg)] text-[var(--color-gray)]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    {t(key)}
                  </div>
                ))}
              </div>
            </section>

            {/* Options and services */}
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('optionsAndServices')}</h2>
              <p className="mt-2 text-sm text-[var(--color-gray-dark)]">
                {t('additionalDriver')} — 1€ / jour
              </p>
            </section>

            {/* Location Map */}
            <section className="border-b border-[var(--color-gray-light)] py-6">
              <ListingLocationMap
                city={listing.city}
                country={listing.country}
                latitude={listing.latitude}
                longitude={listing.longitude}
              />
            </section>

            {/* Reviews */}
            <section className="py-6">
              <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('noComments')}</h2>
            </section>

            {/* Similar vehicles (location only) */}
            {vertical === 'location' && similarListings.length > 0 && (
              <section className="border-t border-[var(--color-gray-light)] py-8">
                <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('similarVehicles')}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {similarListings
                    .filter((l) => l.id !== listing.id)
                    .slice(0, 3)
                    .map((item) => (
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

          {/* Right column: Reservation (desktop only) */}
          <aside className="lg:w-[380px] lg:shrink-0">
            <div className="sticky top-24 space-y-4">
              <ReservationModule
                listing={listing}
                vertical={vertical}
                initialStartAt={urlStartAt || undefined}
                initialEndAt={urlEndAt || undefined}
                canBook={canBook}
              />
              <AvailabilityCalendar listingId={listing.id} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <ListingStickyBottomBar
        listing={listing}
        vertical={vertical}
        startAt={urlStartAt || undefined}
        endAt={urlEndAt || undefined}
        totalPrice={totalPrice}
        canBook={canBook}
      />

      {/* Spacer for mobile bottom bar */}
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}
