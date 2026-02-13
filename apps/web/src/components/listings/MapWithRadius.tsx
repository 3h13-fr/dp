'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

/**
 * Create a polygon approximating a circle (for GeoJSON)
 * Center in [lng, lat], radius in km
 */
function createCircleGeoJSON(
  lng: number,
  lat: number,
  radiusKm: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusKm / 111.32) * Math.cos(angle);
    const dy =
      (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) *
      Math.sin(angle);
    coords.push([lng + dy, lat + dx]);
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

type MapWithRadiusProps = {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  selectedLat?: number;
  selectedLng?: number;
  selectedAddress?: string;
  height?: number;
  className?: string;
};

export function MapWithRadius({
  centerLat,
  centerLng,
  radiusKm,
  selectedLat,
  selectedLng,
  selectedAddress,
  height = 200,
  className = '',
}: MapWithRadiusProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const circleData = createCircleGeoJSON(centerLng, centerLat, radiusKm);

  if (!mounted || !MAPBOX_ACCESS_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-[var(--color-gray-light)] bg-[var(--color-gray-light)]/30 ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-[var(--color-gray-dark)]">
          {MAPBOX_ACCESS_TOKEN ? 'Chargement...' : 'Mapbox non configuré'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[var(--color-gray-light)] ${className}`}
      style={{ height }}
    >
      <Map
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
      >
        <Source id="radius-circle" type="geojson" data={circleData}>
          <Layer
            id="radius-fill"
            type="fill"
            paint={{
              'fill-color': '#6366f1',
              'fill-opacity': 0.1,
            }}
          />
          <Layer
            id="radius-line"
            type="line"
            paint={{
              'line-color': '#6366f1',
              'line-width': 2,
              'line-opacity': 0.6,
            }}
          />
        </Source>
        <Marker longitude={centerLng} latitude={centerLat} anchor="bottom">
          <div className="flex flex-col items-center">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
              <path
                d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                fill="var(--color-primary)"
              />
              <circle cx="14" cy="14" r="5" fill="white" />
            </svg>
            <span className="mt-0.5 text-[10px] font-medium text-[var(--color-gray-dark)]">
              Véhicule
            </span>
          </div>
        </Marker>
        {selectedLat != null && selectedLng != null && (
          <Marker longitude={selectedLng} latitude={selectedLat} anchor="bottom">
            <div className="flex flex-col items-center">
              <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
                <path
                  d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z"
                  fill="#22c55e"
                />
              </svg>
              <span className="mt-0.5 text-[10px] font-medium text-green-600">
                Adresse
              </span>
            </div>
          </Marker>
        )}
      </Map>
      {selectedAddress && (
        <div className="absolute bottom-2 left-2 right-2 rounded bg-white/95 px-2 py-1.5 text-xs text-[var(--color-gray-dark)] shadow">
          {selectedAddress}
        </div>
      )}
    </div>
  );
}
