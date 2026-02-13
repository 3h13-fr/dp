'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { MapRef, ViewStateChangeEvent } from 'react-map-gl';
import { MapboxMap } from '@/components/map/MapboxMap';
import { PricePillMarker } from '@/components/map/PricePillMarker';
import { MapboxPopup } from '@/components/map/MapboxPopup';
import { MapZoomControls } from '@/components/map/MapZoomControls';
import { MapFullscreenButton } from '@/components/map/MapFullscreenButton';
import { MapRefreshButton } from './MapRefreshButton';
import { useListingsMap } from '@/hooks/useListingsMap';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  city?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  type?: string;
};

type ListingsMapViewProps = {
  listings: Listing[];
  listingType?: 'CAR_RENTAL' | 'CHAUFFEUR';
  onSearchUpdate?: (center: { longitude: number; latitude: number }, bounds: { north: number; south: number; east: number; west: number }) => void;
  initialCenter?: { longitude: number; latitude: number };
  className?: string;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
};

export function ListingsMapView({
  listings,
  listingType = 'CAR_RENTAL',
  onSearchUpdate,
  initialCenter,
  className = '',
  isFullscreen = false,
  onFullscreenToggle,
}: ListingsMapViewProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Filtrer les listings qui ont des coordonnées
  const listingsWithCoords = useMemo(
    () =>
      listings.filter(
        (l) =>
          l.latitude != null &&
          l.longitude != null &&
          !Number.isNaN(l.latitude) &&
          !Number.isNaN(l.longitude),
      ),
    [listings],
  );

  // Calculer le centre initial basé sur les listings ou utiliser celui fourni
  const defaultCenter = useMemo(() => {
    if (initialCenter) return initialCenter;
    if (listingsWithCoords.length === 0) return { longitude: 2.3522, latitude: 48.8566 }; // Paris par défaut

    const avgLat =
      listingsWithCoords.reduce((sum, l) => sum + (l.latitude || 0), 0) / listingsWithCoords.length;
    const avgLng =
      listingsWithCoords.reduce((sum, l) => sum + (l.longitude || 0), 0) / listingsWithCoords.length;
    return { longitude: avgLng, latitude: avgLat };
  }, [listingsWithCoords, initialCenter]);

  const { showRefreshButton, handleMoveEnd, handleRefresh } = useListingsMap({
    initialCenter: defaultCenter,
    mapRef,
    onSearchUpdate: (center, bounds) => {
      onSearchUpdate?.(center, bounds);
    },
  });

  const handleMarkerClick = useCallback((listing: Listing) => {
    setSelectedListing(listing);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedListing(null);
  }, []);

  const handleMapClick = useCallback(() => {
    // Fermer le popup si on clique sur la carte (pas sur un marker)
    // Les markers ont déjà stopPropagation dans leur gestionnaire onClick
    if (selectedListing) {
      setSelectedListing(null);
    }
  }, [selectedListing]);

  const handleRefreshClick = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  if (listingsWithCoords.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ minHeight: '300px', height: '100%' }}>
        <div className="text-center p-4">
          <p className="text-sm font-medium text-muted-foreground">Aucun véhicule avec localisation disponible</p>
          <p className="text-xs text-muted-foreground mt-2">
            {listings.length > 0 
              ? `${listings.length} véhicule(s) trouvé(s) mais sans coordonnées GPS`
              : 'Aucun véhicule trouvé'}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className={`relative w-full ${className}`} style={{ height: '100%', minHeight: '300px' }}>
      <MapboxMap
        ref={mapRef}
        center={[defaultCenter.longitude, defaultCenter.latitude]}
        zoom={listingsWithCoords.length === 1 ? 12 : 10}
        onMoveEnd={handleMoveEnd}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
      >
        {listingsWithCoords.map((listing) => {
          const price = listing.pricePerDay != null
            ? typeof listing.pricePerDay === 'number'
              ? listing.pricePerDay
              : (listing.pricePerDay as { toNumber?: () => number })?.toNumber?.() ?? null
            : null;

          // Ne pas afficher le marker si pas de prix
          if (price == null) return null;

          return (
            <PricePillMarker
              key={listing.id}
              longitude={listing.longitude!}
              latitude={listing.latitude!}
              price={price}
              currency={listing.currency || 'EUR'}
              onClick={() => handleMarkerClick(listing)}
              isSelected={selectedListing?.id === listing.id}
            />
          );
        })}
        {selectedListing && (
          <MapboxPopup
            listing={selectedListing}
            longitude={selectedListing.longitude!}
            latitude={selectedListing.latitude!}
            onClose={handleClosePopup}
            listingType={listingType}
          />
        )}
      </MapboxMap>
      <MapZoomControls mapRef={mapRef} />
      {onFullscreenToggle && (
        <MapFullscreenButton
          isFullscreen={isFullscreen}
          onToggle={onFullscreenToggle}
        />
      )}
      {showRefreshButton && <MapRefreshButton onClick={handleRefreshClick} />}
    </div>
  );
}
