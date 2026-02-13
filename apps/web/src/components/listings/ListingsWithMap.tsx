'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ListingsGrid } from './ListingsGrid';
import { ListingsMapView } from './ListingsMapView';
import { MapToggle } from './MapToggle';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ListingTypeParam = 'CAR_RENTAL' | 'CHAUFFEUR';

type ListingItem = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  type?: string;
  photos?: Array<{ url: string; order?: number }>;
};

type ListingsWithMapProps = {
  listingType: ListingTypeParam;
};

export function ListingsWithMap({ listingType }: ListingsWithMapProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Récupérer les listings pour la carte
  const fetchListings = useCallback(() => {
    const params = new URLSearchParams();
    params.set('type', listingType);
    const city = searchParams.get('city') ?? searchParams.get('q') ?? '';
    if (city.trim()) params.set('city', city.trim());
    const country = searchParams.get('country');
    if (country?.trim()) params.set('country', country.trim());
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    if (lat && lng) {
      params.set('lat', lat);
      params.set('lng', lng);
      if (radius) params.set('radius', radius);
    }
    params.set('limit', '100'); // Plus de résultats pour la carte

    return fetch(`${API_URL}/listings?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        const items = data.items ?? [];
        setListings(items);
      })
      .catch((err) => {
        console.error('[ListingsWithMap] Error fetching listings:', err);
        setListings([]);
      });
  }, [listingType, searchParams]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearchUpdate = useCallback(
    (center: { longitude: number; latitude: number }, bounds: { north: number; south: number; east: number; west: number }) => {
      // Calculer un rayon approximatif basé sur les bounds
      const latDiff = bounds.north - bounds.south;
      const lngDiff = bounds.east - bounds.west;
      const avgLat = (bounds.north + bounds.south) / 2;
      const radiusMeters = Math.max(
        (latDiff * 111000) / 2, // 1 degré lat ≈ 111km
        (lngDiff * 111000 * Math.cos((avgLat * Math.PI) / 180)) / 2,
      );

      // Mettre à jour les paramètres de recherche
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('lat', center.latitude.toString());
      newParams.set('lng', center.longitude.toString());
      newParams.set('radius', Math.round(radiusMeters).toString());
      router.push(`?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-4 h-[calc(100vh-250px)] min-h-[600px] max-h-[900px]">
      {/* Liste des listings à gauche */}
      <div className={`flex flex-col transition-all duration-300 ${
        isMapExpanded ? 'lg:w-0 lg:overflow-hidden lg:opacity-0' : 'lg:w-[50%] w-full lg:opacity-100'
      }`}>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 lg:pr-4">
          <ListingsGrid listingType={listingType} />
        </div>
      </div>

      {/* Carte à droite */}
      <div className={`flex flex-col transition-all duration-300 relative ${
        isMapExpanded ? 'lg:w-full' : 'lg:w-[50%] w-full'
      }`}>
        {/* Conteneur carte avec padding et coins arrondis */}
        <div className="lg:sticky lg:top-4 flex flex-col h-full lg:h-[calc(100vh-250px)] lg:min-h-[600px] lg:max-h-[900px]">
          {/* Toggle pour réduire/agrandir la carte */}
          <div className="flex justify-end mb-2 z-10 px-4 lg:px-0">
            <MapToggle isExpanded={isMapExpanded} onToggle={() => setIsMapExpanded(!isMapExpanded)} />
          </div>

          {/* Carte avec padding et coins arrondis */}
          <div className="flex-1 relative min-h-[400px] lg:min-h-0 rounded-xl overflow-hidden bg-white shadow-lg p-4">
            <div className="w-full h-full rounded-xl overflow-hidden">
              <ListingsMapView
                listings={listings}
                listingType={listingType}
                onSearchUpdate={handleSearchUpdate}
                className="w-full h-full"
                isFullscreen={isMapExpanded}
                onFullscreenToggle={() => setIsMapExpanded(!isMapExpanded)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
