'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';
import { useKycModal } from '@/contexts/KycModalContext';

type Booking = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: unknown;
  currency: string;
  listing: { id: string; title?: string | null; displayName?: string | null; type: string };
  guest: { id: string; firstName: string | null; lastName: string | null; email: string };
};

type DraftListing = {
  id: string;
  title?: string | null;
  displayName?: string | null;
  type: string;
  status: string;
  photos: { url: string; order: number }[];
  vehicleId?: string | null;
};

type GroupedDraftListing = {
  vehicleId: string;
  listings: DraftListing[];
  displayName: string;
  photos: { url: string; order: number }[];
};

type DisplayDraftItem = GroupedDraftListing | DraftListing;

function isGroupedDraftListing(item: DisplayDraftItem): item is GroupedDraftListing {
  return 'listings' in item && Array.isArray(item.listings);
}

function groupDraftListingsByVehicle(listings: DraftListing[]): DisplayDraftItem[] {
  const grouped = new Map<string, DraftListing[]>();
  const ungrouped: DraftListing[] = [];

  for (const listing of listings) {
    if (listing.vehicleId) {
      const key = listing.vehicleId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(listing);
    } else {
      ungrouped.push(listing);
    }
  }

  const result: DisplayDraftItem[] = [];

  // Ajouter les listings groupés
  for (const [vehicleId, vehicleListings] of grouped) {
    if (vehicleListings.length > 1) {
      // Grouper seulement s'il y a plusieurs listings
      const firstListing = vehicleListings[0];
      result.push({
        vehicleId,
        listings: vehicleListings,
        displayName: firstListing.displayName || firstListing.title || '—',
        photos: firstListing.photos || [],
      });
    } else {
      // Un seul listing avec vehicleId, l'ajouter tel quel
      result.push(vehicleListings[0]);
    }
  }

  // Ajouter les listings sans vehicleId
  result.push(...ungrouped);

  return result;
}

export default function HostDashboardPage() {
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const tKyc = useTranslations('kyc');
  const { openKyc } = useKycModal();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [draftListings, setDraftListings] = useState<DraftListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    Promise.all([
      apiFetch('/auth/me').then((r) => (r.ok ? r.json() : null)).then((u) => u?.kycStatus ?? null).catch(() => null),
      apiFetch('/bookings/host?limit=50')
        .then((r) => r.json())
        .then((d: { items: Booking[] }) => {
          const items = d?.items ?? [];
          return items
            .filter((b) => new Date(b.startAt) >= now && b.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .slice(0, 10);
        })
        .catch(() => []),
      apiFetch('/listings/my?status=DRAFT&limit=10')
        .then((r) => r.json())
        .then((d: { items: DraftListing[] }) => d?.items ?? [])
        .catch(() => []),
    ]).then(([kyc, bookings, drafts]) => {
      setKycStatus(kyc);
      setUpcomingBookings(bookings);
      setDraftListings(drafts);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('dashboardTitle')}</h1>

      {kycStatus !== 'APPROVED' && (
        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-900">{t('kycReminder')}</h2>
          <p className="mt-2 font-medium text-amber-800">{tKyc('requiredToCreateListing')}</p>
          <button
            type="button"
            onClick={() => openKyc(true)}
            className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            {tKyc('goToKyc')}
          </button>
        </div>
      )}

      {/* Section À faire - Listings en brouillons */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t('todo')}</h2>
        {loading ? (
          <p className="mt-2 text-muted-foreground">{t('loading')}</p>
        ) : draftListings.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t('noDraftListings')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {groupDraftListingsByVehicle(draftListings).map((item) => {
              if (isGroupedDraftListing(item)) {
                const carRentalListing = item.listings.find((l) => l.type === 'CAR_RENTAL');
                const chauffeurListing = item.listings.find((l) => l.type === 'CHAUFFEUR');
                const primaryListing = carRentalListing || item.listings[0];
                
                return (
                  <li
                    key={`grouped-${item.vehicleId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white p-4"
                  >
                    <div className="flex gap-4">
                      {item.photos?.[0]?.url ? (
                        <img
                          src={item.photos[0].url}
                          alt=""
                          className="h-16 w-24 rounded object-cover"
                        />
                      ) : (
                        <div className="h-16 w-24 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium">{item.displayName}</p>
                        <div className="mt-1 flex gap-2">
                          {carRentalListing && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {t('locations')}
                            </span>
                          )}
                          {chauffeurListing && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              {t('chauffeur')}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('draft')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/${locale}/host/listings/${primaryListing.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('continueListing')}
                      </Link>
                      {carRentalListing && chauffeurListing && (
                        <Link
                          href={`/${locale}/host/listings/${chauffeurListing.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t('chauffeur')}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              } else {
                // Listing individuel
                const listingTitle = getListingTitle(item);
                const listingTypeLabel = 
                  item.type === 'CAR_RENTAL' ? t('locations') :
                  item.type === 'MOTORIZED_EXPERIENCE' ? t('experiences') :
                  t('chauffeur');
                
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white p-4"
                  >
                    <div className="flex gap-4">
                      {item.photos?.[0]?.url ? (
                        <img
                          src={item.photos[0].url}
                          alt=""
                          className="h-16 w-24 rounded object-cover"
                        />
                      ) : (
                        <div className="h-16 w-24 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium">{listingTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {listingTypeLabel} · {t('draft')}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/host/listings/${item.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('continueListing')}
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t('upcomingBookings')}</h2>
        {loading ? (
          <p className="mt-2 text-muted-foreground">{t('loading')}</p>
        ) : upcomingBookings.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t('noBookings')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcomingBookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white p-4"
              >
                <div>
                  <p className="font-medium">{b.listing ? getListingTitle(b.listing) : '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    {[b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(b.startAt).toLocaleDateString()} – {new Date(b.endAt).toLocaleDateString()}
                    {' · '}
                    {String(b.totalAmount)} {b.currency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${locale}/host/bookings/${b.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('detail')}
                  </Link>
                  <Link
                    href={`/${locale}/host/messages?bookingId=${b.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('message')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && (
          <Link
            href={`/${locale}/host/bookings`}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('viewAllBookings')}
          </Link>
        )}
      </section>
    </div>
  );
}
