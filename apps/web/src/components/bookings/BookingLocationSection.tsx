'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MapboxMap } from '@/components/map/MapboxMap';
import { MapboxMarker } from '@/components/map/MapboxMarker';

interface BookingLocationSectionProps {
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function BookingLocationSection({
  city,
  country,
  latitude,
  longitude,
}: BookingLocationSectionProps) {
  const t = useTranslations('booking.location');

  // Calculate approximate center coordinates
  const mapCenter = useMemo<[number, number]>(() => {
    if (latitude != null && longitude != null) {
      // Add small random offset (±0.01 degrees ≈ ±1km) to approximate city center
      const offsetLat = (Math.random() - 0.5) * 0.02;
      const offsetLng = (Math.random() - 0.5) * 0.02;
      return [longitude + offsetLng, latitude + offsetLat];
    }

    // Fallback to city center approximations
    if (city === 'Paris' || city?.toLowerCase().includes('paris')) {
      return [2.3522, 48.8566];
    }
    if (city === 'Lyon' || city?.toLowerCase().includes('lyon')) {
      return [4.8357, 45.764];
    }
    if (city === 'Marseille' || city?.toLowerCase().includes('marseille')) {
      return [5.3698, 43.2965];
    }
    return [2.3522, 48.8566];
  }, [latitude, longitude, city]);

  const zoom = 12.5;

  if (!city && !country) {
    return null;
  }

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <h2 className="text-xl font-bold">{t('title')}</h2>

      {/* Map */}
      <div className="relative mt-4 h-64 w-full overflow-hidden rounded-xl bg-muted lg:h-80">
        <MapboxMap center={mapCenter} zoom={zoom}>
          <MapboxMarker longitude={mapCenter[0]} latitude={mapCenter[1]} />
        </MapboxMap>
      </div>

      {/* Address Note */}
      <div className="mt-4">
        <p className="text-sm font-medium text-muted-foreground">{t('address')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('addressNote')}</p>
      </div>
    </div>
  );
}
