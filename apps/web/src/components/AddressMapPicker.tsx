'use client';

import { useState, useEffect, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export type AddressMapSuggestion = {
  address: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type AddressMapPickerProps = {
  latitude: number;
  longitude: number;
  address?: string;
  onPositionChange: (lat: number, lng: number, address: AddressMapSuggestion) => void;
  className?: string;
  height?: number;
};

async function reverseGeocode(lng: number, lat: number): Promise<AddressMapSuggestion> {
  if (!MAPBOX_ACCESS_TOKEN) {
    return {
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
    };
  }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&types=address,place`;
  const res = await fetch(url);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    return {
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
    };
  }
  const [, latCoord] = feature.center;
  let city: string | undefined;
  let country: string | undefined;
  if (feature.context) {
    const placeCtx = feature.context.find((c: { id: string }) => c.id.startsWith('place.'));
    const countryCtx = feature.context.find((c: { id: string }) => c.id.startsWith('country.'));
    if (placeCtx) city = placeCtx.text;
    if (countryCtx) country = countryCtx.short_code || countryCtx.text;
  }
  return {
    address: feature.place_name,
    city,
    country,
    latitude: latCoord,
    longitude: lng,
  };
}

export function AddressMapPicker({
  latitude,
  longitude,
  address,
  onPositionChange,
  className = '',
  height = 200,
}: AddressMapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState({
    longitude,
    latitude,
    zoom: 14,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recenter map when latitude/longitude changes
  useEffect(() => {
    setViewState({
      longitude,
      latitude,
      zoom: 14,
    });
  }, [latitude, longitude]);

  const handleMarkerDragEnd = useCallback(
    async (evt: { lngLat: { lng: number; lat: number } }) => {
      const { lng, lat } = evt.lngLat;
      setLoading(true);
      try {
        const result = await reverseGeocode(lng, lat);
        onPositionChange(lat, lng, result);
      } finally {
        setLoading(false);
      }
    },
    [onPositionChange],
  );

  if (!mounted || !MAPBOX_ACCESS_TOKEN) {
    return (
      <div
        className={`rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-neutral-500">
          {MAPBOX_ACCESS_TOKEN ? 'Chargement de la carte...' : 'Mapbox non configuré'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg border border-neutral-200 overflow-hidden ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
          <span className="text-sm text-neutral-600">Mise à jour de l'adresse...</span>
        </div>
      )}
      <Map
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
      >
        <Marker
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          draggable
          onDragEnd={handleMarkerDragEnd}
        >
          <div className="cursor-grab active:cursor-grabbing">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
              <path
                d="M16 0C7.163 0 0 7.163 0 16c0 11.045 16 24 16 24s16-12.955 16-24c0-8.837-7.163-16-16-16z"
                fill="hsl(var(--primary))"
              />
              <circle cx="16" cy="16" r="6" fill="white" />
            </svg>
          </div>
        </Marker>
      </Map>
      {address && (
        <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-white/90 rounded text-xs text-neutral-700 truncate">
          {address}
        </div>
      )}
    </div>
  );
}
