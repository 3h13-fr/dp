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
  vehicleId?: string | null;
};

type GroupedListing = {
  vehicleId: string;
  listings: Listing[];
  displayName: string;
  photos: { url: string; order: number }[];
  city: string | null;
  country: string | null;
};

type DisplayItem = GroupedListing | Listing;

type ListingTypeFilter = 'all' | 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE';

function isGroupedListing(item: DisplayItem): item is GroupedListing {
  return 'listings' in item && Array.isArray(item.listings);
}

function getWorstStatus(listings: Listing[]): string {
  const statusPriority: Record<string, number> = {
    DRAFT: 0,
    PENDING: 1,
    ACTIVE: 2,
    SUSPENDED: 3,
  };
  return listings.reduce((worst, listing) => {
    const currentPriority = statusPriority[listing.status] ?? 0;
    const worstPriority = statusPriority[worst] ?? 0;
    return currentPriority > worstPriority ? listing.status : worst;
  }, listings[0].status);
}

function groupListingsByVehicle(listings: Listing[]): DisplayItem[] {
  const grouped = new Map<string, Listing[]>();
  const ungrouped: Listing[] = [];

  for (const listing of listings) {
    // Vérifier si vehicleId existe (peut être null, undefined, ou une string)
    // Accéder à vehicleId de manière plus robuste
    const vehicleId = listing.vehicleId ?? (listing as Record<string, unknown>).vehicleId;
    if (vehicleId && typeof vehicleId === 'string' && vehicleId.trim() !== '') {
      const key = vehicleId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(listing);
    } else {
      ungrouped.push(listing);
    }
  }

  const result: DisplayItem[] = [];

  // Ajouter les listings groupés
  grouped.forEach((vehicleListings, vehicleId) => {
    if (vehicleListings.length > 1) {
      // Grouper seulement s'il y a plusieurs listings
      const firstListing = vehicleListings[0];
      result.push({
        vehicleId,
        listings: vehicleListings,
        displayName: firstListing.displayName || firstListing.title || '—',
        photos: firstListing.photos || [],
        city: firstListing.city,
        country: firstListing.country,
      });
    } else {
      // Un seul listing avec vehicleId, l'ajouter tel quel
      result.push(vehicleListings[0]);
    }
  });

  // Ajouter les listings sans vehicleId
  result.push(...ungrouped);

  return result;
}

export default function HostListingsPage() {
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const [data, setData] = useState<{ items: Listing[]; total: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>('all');

  useEffect(() => {
    // Toujours récupérer tous les listings pour permettre le regroupement par vehicleId
    // Le filtrage par type se fera côté frontend après regroupement
    apiFetch('/listings/my?limit=50')
      .then((res) => res.json())
      .then((result) => {
        // Ensure result has the expected structure
        if (result && typeof result === 'object') {
          const items = Array.isArray(result.items) ? result.items : [];
          setData({
            items: items as Listing[],
            total: typeof result.total === 'number' ? result.total : 0,
          });
        } else {
          setData({ items: [], total: 0 });
        }
      })
      .catch((err) => {
        console.error('[HostListings] Error fetching listings:', err);
        setData({ items: [], total: 0 });
      });
  }, []);

  if (!data) return <p className="text-muted-foreground">{t('loading')}</p>;

  const rawItems = data.items || [];
  const total = data.total || 0;
  
  // Grouper les listings par vehicleId
  let displayItems = groupListingsByVehicle(rawItems);
  
  // Filtrer les listings groupés selon le typeFilter (après regroupement)
  if (typeFilter !== 'all') {
    displayItems = displayItems.filter((item) => {
      if (isGroupedListing(item)) {
        // Pour "Location" (CAR_RENTAL), inclure aussi CHAUFFEUR car ce sont des locations de véhicules
        if (typeFilter === 'CAR_RENTAL') {
          return item.listings.some((l) => l.type === 'CAR_RENTAL' || l.type === 'CHAUFFEUR');
        }
        // Un listing groupé est inclus si au moins un de ses listings correspond au filtre
        return item.listings.some((l) => l.type === typeFilter);
      } else {
        // Pour "Location" (CAR_RENTAL), inclure aussi CHAUFFEUR
        if (typeFilter === 'CAR_RENTAL') {
          return item.type === 'CAR_RENTAL' || item.type === 'CHAUFFEUR';
        }
        // Listing individuel : vérifier le type
        return item.type === typeFilter;
      }
    });
  }

  const tabs = [
    { value: 'all' as ListingTypeFilter, label: t('all') },
    { value: 'CAR_RENTAL' as ListingTypeFilter, label: t('locations') },
    { value: 'MOTORIZED_EXPERIENCE' as ListingTypeFilter, label: t('experiences') },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('listings')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('listingsCount', { count: displayItems.length })}
          </p>
        </div>
        <Link
          href={`/${locale}/host/listings/new`}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90"
        >
          {t('addListing')}
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <nav className="-mb-px flex gap-4" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={typeFilter === tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {displayItems.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t('noListings')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {displayItems.map((item) => {
            if (isGroupedListing(item)) {
              const carRentalListing = item.listings.find((l) => l.type === 'CAR_RENTAL');
              const chauffeurListing = item.listings.find((l) => l.type === 'CHAUFFEUR');
              const primaryListing = carRentalListing || item.listings[0];
              
              return (
                <li
                  key={`grouped-${item.vehicleId}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
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
                        {carRentalListing && !chauffeurListing && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {t('locationAlone')}
                          </span>
                        )}
                        {!carRentalListing && chauffeurListing && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            {t('locationWithDriver')}
                          </span>
                        )}
                        {carRentalListing && chauffeurListing && (
                          <>
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {t('locationAlone')}
                            </span>
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              {t('locationWithDriver')}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getWorstStatus(item.listings)} · {item.city || ''}
                      </p>
                      {primaryListing.pricePerDay != null && (
                        <p className="text-sm">
                          {String(primaryListing.pricePerDay)} {primaryListing.currency} / day
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/${locale}/host/listings/${primaryListing.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('detail')}
                    </Link>
                    {carRentalListing && chauffeurListing && (
                      <Link
                        href={`/${locale}/host/listings/${chauffeurListing.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('chauffeur')}
                      </Link>
                    )}
                    {carRentalListing && (
                      <Link
                        href={`/${locale}/location/${carRentalListing.slug ?? carRentalListing.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('viewListing')}
                      </Link>
                    )}
                  </div>
                </li>
              );
            } else {
              // Listing individuel (sans vehicleId ou seul listing avec vehicleId)
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
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
                      <p className="font-medium">{getListingTitle(item)}</p>
                      <div className="mt-1 flex gap-2">
                        {item.type === 'CAR_RENTAL' && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {t('locationAlone')}
                          </span>
                        )}
                        {item.type === 'CHAUFFEUR' && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            {t('locationWithDriver')}
                          </span>
                        )}
                        {item.type === 'MOTORIZED_EXPERIENCE' && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            {t('experiences')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.status} · {item.city || ''}
                      </p>
                      {item.pricePerDay != null && (
                        <p className="text-sm">
                          {String(item.pricePerDay)} {item.currency} / day
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/${locale}/host/listings/${item.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('detail')}
                    </Link>
                    <Link
                      href={`/${locale}/${item.type === 'CAR_RENTAL' ? 'location' : item.type === 'MOTORIZED_EXPERIENCE' ? 'experience' : 'ride'}/${item.slug ?? item.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('viewListing')}
                    </Link>
                  </div>
                </li>
              );
            }
          })}
        </ul>
      )}
    </div>
  );
}
