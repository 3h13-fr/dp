'use client';

import { useMemo } from 'react';
import { MapboxMap } from '@/components/map/MapboxMap';
import { MapboxMarker } from '@/components/map/MapboxMarker';
import { useTranslations } from 'next-intl';

type ListingLocationMapProps = {
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Map component that displays approximate location (city level) without revealing exact address
 * Uses approximate coordinates to protect privacy
 */
export function ListingLocationMap({
  city,
  country,
  latitude,
  longitude,
}: ListingLocationMapProps) {
  const t = useTranslations('listing');

  // Calculate approximate center coordinates
  // If exact coordinates are provided, add small random offset to approximate city center
  // Otherwise, use city-level approximation
  const mapCenter = useMemo<[number, number]>(() => {
    if (latitude != null && longitude != null) {
      // Add small random offset (±0.01 degrees ≈ ±1km) to approximate city center
      // This prevents revealing exact address while staying in the same city area
      const offsetLat = (Math.random() - 0.5) * 0.02;
      const offsetLng = (Math.random() - 0.5) * 0.02;
      return [longitude + offsetLng, latitude + offsetLat];
    }

    // Fallback to city center approximations (common cities)
    // In production, you might want to use a geocoding service for city centers
    if (city === 'Paris' || city?.toLowerCase().includes('paris')) {
      return [2.3522, 48.8566]; // Paris center
    }
    if (city === 'Lyon' || city?.toLowerCase().includes('lyon')) {
      return [4.8357, 45.764]; // Lyon center
    }
    if (city === 'Marseille' || city?.toLowerCase().includes('marseille')) {
      return [5.3698, 43.2965]; // Marseille center
    }
    // Default to Paris if no city match
    return [2.3522, 48.8566];
  }, [latitude, longitude, city]);

  // Use limited zoom level (12-13) to show city area, not exact address
  const zoom = 12.5;

  if (!city && !country) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-black)]">
        {t('whereIsVehicle')}
      </h2>
      <p className="mb-4 text-sm text-[var(--color-gray)]">
        {[city, country].filter(Boolean).join(', ')}
      </p>
      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-[var(--color-gray-bg)]">
        <MapboxMap center={mapCenter} zoom={zoom}>
          <MapboxMarker longitude={mapCenter[0]} latitude={mapCenter[1]} />
        </MapboxMap>
      </div>
      <p className="mt-2 text-xs text-[var(--color-gray)]">
        {t('approximateLocation')}
      </p>
    </div>
  );
}
