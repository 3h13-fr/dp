'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MapRef } from 'react-map-gl';
import { MapboxMap } from '@/components/map/MapboxMap';
import { PricePillMarker } from '@/components/map/PricePillMarker';
import { ClusterMarker } from '@/components/map/ClusterMarker';
import { MapZoomControls } from '@/components/map/MapZoomControls';
import { MapFullscreenButton } from '@/components/map/MapFullscreenButton';
import { ListingMiniCard } from '@/components/map/ListingMiniCard';
import { ListingsGrid } from './ListingsGrid';
import { ListingsBottomSheet } from './ListingsBottomSheet';
import { useMapDrivenSearch } from '@/hooks/useMapDrivenSearch';
import { useMarkerClustering } from '@/hooks/useMarkerClustering';
import { useSearchListings, type ListingTypeParam, type ListingItem } from '@/hooks/useSearchListings';
import { clsx } from 'clsx';
import { calculateListingPrice, type ListingForPricing } from '@/lib/pricing';
import { ViewStateChangeEvent } from 'react-map-gl';

type MapDrivenSearchProps = {
  listingType: ListingTypeParam;
};

type SheetState = 'peek' | 'mid' | 'full';

export function MapDrivenSearch({ listingType }: MapDrivenSearchProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const mapRef = useRef<MapRef>(null);
  
  // Utiliser le hook centralisé pour la recherche
  const { listings, loading, error, state } = useSearchListings(listingType);
  
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetState, setSheetState] = useState<SheetState>('peek');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMapInteractive, setIsMapInteractive] = useState(true);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const isCenteringRef = useRef(false); // Flag pour désactiver useMapDrivenSearch pendant le recentrage
  
  // Get startAt and endAt from URL for price calculation
  const startAt = searchParams.get('startAt') ?? '';
  const endAt = searchParams.get('endAt') ?? '';

  // Détecter si on est sur mobile (basé sur la largeur de l'écran)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint de Tailwind
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Récupérer le centre initial depuis l'URL ou les résultats
  const initialCenter = useMemo(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    // PRIORITÉ 1 : Coordonnées explicites dans l'URL
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        return { latitude: latNum, longitude: lngNum };
      }
    }
    
    // PRIORITÉ 2 : Centre des résultats si disponibles
    if (listingsWithCoords.length > 0) {
      const avgLat = listingsWithCoords.reduce((sum, l) => sum + (l.latitude || 0), 0) / listingsWithCoords.length;
      const avgLng = listingsWithCoords.reduce((sum, l) => sum + (l.longitude || 0), 0) / listingsWithCoords.length;
      return { latitude: avgLat, longitude: avgLng };
    }
    
    // Fallback : Paris seulement si aucune recherche
    return { latitude: 48.8566, longitude: 2.3522 };
  }, [searchParams, listingsWithCoords]);

  // Hook pour gérer les événements de la carte
  const { handleMapMoveEnd, isLoading: isMapLoading } = useMapDrivenSearch({
    initialCenter,
    mapRef,
    onBoundsChange: useCallback(
      (center: { longitude: number; latitude: number }, bounds: { north: number; south: number; east: number; west: number }, radiusMeters: number) => {
        // Ne pas déclencher de recherche si :
        // 1. On est en train de recentrer la carte programmatiquement
        // 2. On est en train de résoudre une ville (resolving-city)
        // 3. On est en train de faire une recherche initiale (searching avec coordonnées 0,0)
        if (isCenteringRef.current || state.status === 'resolving-city') {
          return;
        }
        
        // Ne pas déclencher si on vient de faire une recherche avec une ville (pour éviter les boucles)
        const city = searchParams.get('city') ?? searchParams.get('q') ?? '';
        if (city && state.status === 'searching') {
          // Attendre que la recherche soit terminée avant d'autoriser les mises à jour de la carte
          return;
        }
        
        // Mettre à jour l'URL avec les nouvelles bounds
        // Le hook useSearchListings détectera le changement et fera la recherche automatiquement
        const newParams = new URLSearchParams(searchParams.toString());
        
        // Préserver le paramètre city s'il existe (pour le fallback backend)
        const existingCity = searchParams.get('city') ?? searchParams.get('q');
        if (existingCity) {
          newParams.set('city', existingCity);
        }
        
        newParams.set('lat', center.latitude.toString());
        newParams.set('lng', center.longitude.toString());
        newParams.set('radius', radiusMeters.toString());
        router.push(`?${newParams.toString()}`, { scroll: false });
      },
      [searchParams, router, state.status],
    ),
    debounceMs: 300,
  });

  // Centrer la carte sur les coordonnées si disponibles
  useEffect(() => {
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');
    
    if (urlLat && urlLng && mapRef.current && (state.status === 'searching' || state.status === 'success')) {
      const latNum = parseFloat(urlLat);
      const lngNum = parseFloat(urlLng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const map = mapRef.current.getMap();
        if (map) {
          // Vérifier si la carte est déjà centrée sur ces coordonnées
          const currentCenter = map.getCenter();
          const distance = Math.sqrt(
            Math.pow(currentCenter.lng - lngNum, 2) + 
            Math.pow(currentCenter.lat - latNum, 2)
          );
          
          // Si la distance est > 0.01 degrés (~1km), recentrer
          if (distance > 0.01) {
            // Désactiver temporairement useMapDrivenSearch pendant le recentrage
            isCenteringRef.current = true;
            
            map.flyTo({
              center: [lngNum, latNum],
              zoom: 12,
              duration: 500,
            });
            
            // Réactiver useMapDrivenSearch après le recentrage
            setTimeout(() => {
              isCenteringRef.current = false;
            }, 600); // Légèrement plus long que la durée de l'animation (500ms)
          }
        }
      }
    }
  }, [searchParams.get('lat'), searchParams.get('lng'), state.status]);

  // Gérer le changement d'état du bottom sheet
  const handleSheetStateChange = useCallback((state: SheetState) => {
    setSheetState(state);
    setIsMapInteractive(state === 'peek');
  }, []);

  // Utiliser le clustering pour les marqueurs
  // maxZoom: 14 signifie que les points individuels seront affichés à partir du zoom 14
  const clusters = useMarkerClustering({
    listings: listingsWithCoords.map((l) => ({
      id: l.id,
      latitude: l.latitude!,
      longitude: l.longitude!,
      ...l,
    })),
    zoom: mapZoom,
    bounds: mapBounds,
    maxZoom: 14, // Réduire maxZoom pour afficher les marqueurs individuels plus tôt
  });

  // Handler pour mettre à jour le zoom et les bounds
  const handleMapMove = useCallback((evt: ViewStateChangeEvent) => {
    setMapZoom(evt.viewState.zoom);
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        const bounds = map.getBounds();
        if (bounds) {
          setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
        }
      }
    }
  }, []);

  // Initialiser les bounds au chargement de la carte
  useEffect(() => {
    if (mapRef.current && !mapBounds) {
      const map = mapRef.current.getMap();
      if (map) {
        const bounds = map.getBounds();
        if (bounds) {
          setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
        }
      }
    }
  }, [mapBounds]);

  // Handler pour zoom sur cluster
  const handleClusterClick = useCallback((clusterId: number, longitude: number, latitude: number) => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        const currentZoom = map.getZoom();
        map.flyTo({
          center: [longitude, latitude],
          zoom: Math.min(currentZoom + 2, 16),
          duration: 500,
        });
      }
    }
  }, []);

  // Trouver le listing sélectionné
  const selectedListing = useMemo(
    () => (selectedListingId ? listings.find((l) => l.id === selectedListingId) : null),
    [selectedListingId, listings],
  );

  // Handler pour le clic sur un marker
  // Ne pas ouvrir la popup automatiquement, juste sélectionner pour le highlight
  const handleMarkerClick = useCallback((listingId: string) => {
    setSelectedListingId(listingId);
    // Sur mobile, si le sheet n'est pas en peek, le mettre en peek pour voir la carte
    if (isMobile && sheetState !== 'peek') {
      setSheetState('peek');
    }
    // Ne pas ouvrir ListingMiniCard automatiquement
  }, [isMobile, sheetState]);

  // Handler pour le hover sur un item de la liste (desktop)
  const handleListingHover = useCallback((listingId: string | null) => {
    setHoveredListingId(listingId);
  }, []);

  // Handler pour le clic sur un item de la liste
  const handleListingClick = useCallback((listingId: string) => {
    setSelectedListingId(listingId);
    // Centrer la carte sur le listing sélectionné
    const listing = listings.find((l) => l.id === listingId);
    if (listing && listing.latitude && listing.longitude && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        map.flyTo({
          center: [listing.longitude, listing.latitude],
          zoom: Math.max(map.getZoom(), 12),
          duration: 500,
        });
      }
    }
  }, [listings]);

  // Bouton pour revenir à la carte (mobile, quand sheet n'est pas en peek)
  const handleShowMap = useCallback(() => {
    setSheetState('peek');
  }, []);

  // Calculer le centre par défaut pour la carte
  const defaultCenter = useMemo(() => {
    // Si on a un centre initial (depuis URL ou ville recherchée), l'utiliser
    if (initialCenter) {
      return [initialCenter.longitude, initialCenter.latitude] as [number, number];
    }
    
    // Sinon, utiliser le centre des résultats si disponibles
    if (listingsWithCoords.length > 0) {
      const avgLat =
        listingsWithCoords.reduce((sum, l) => sum + (l.latitude || 0), 0) / listingsWithCoords.length;
      const avgLng =
        listingsWithCoords.reduce((sum, l) => sum + (l.longitude || 0), 0) / listingsWithCoords.length;
      return [avgLng, avgLat] as [number, number];
    }
    
    // Fallback à Paris seulement si aucune recherche n'est en cours
    // Si on recherche une ville, on attendra que les coordonnées soient récupérées
    // (le useEffect ci-dessus mettra à jour l'URL et recentrera la carte)
    return [2.3522, 48.8566] as [number, number]; // Paris par défaut
  }, [listingsWithCoords, initialCenter]);

  // Layout Desktop
  if (!isMobile) {
    return (
      <div className="flex h-[calc(100vh-200px)] min-h-[600px]">
        {/* Liste à gauche */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            isMapFullscreen ? 'w-0 overflow-hidden opacity-0' : 'w-[50%]'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <ListingsGrid
              listingType={listingType}
              selectedListingId={selectedListingId}
              onListingHover={handleListingHover}
              onListingClick={handleListingClick}
              listings={listings}
            />
          </div>
        </div>

        {/* Carte à droite — 50%, marges haut/droite/bas et coins arrondis */}
        <div
          className={`relative transition-all duration-300 flex flex-col ${
            isMapFullscreen ? 'w-full' : 'w-[50%]'
          } ${!isMapFullscreen ? 'pt-4 pr-4 pb-4' : ''}`}
        >
          <div
            className={`sticky top-4 w-full flex-1 min-h-[600px] rounded-xl overflow-hidden shadow-lg relative ${
              isMapFullscreen ? 'rounded-none' : ''
            }`}
          >
            <MapboxMap
              ref={mapRef}
              center={defaultCenter as [number, number]}
              zoom={listingsWithCoords.length === 1 ? 12 : mapZoom || 10}
              onMove={handleMapMove}
              onMoveEnd={handleMapMoveEnd}
              onLoad={() => {
                // Initialiser les bounds et le zoom au chargement de la carte
                if (mapRef.current) {
                  const map = mapRef.current.getMap();
                  if (map) {
                    setMapZoom(map.getZoom());
                    const bounds = map.getBounds();
                    if (bounds) {
                      setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
                    }
                  }
                }
              }}
              style={{ width: '100%', height: '100%' }}
            >
              {clusters.map((cluster) => {
                const { properties, geometry } = cluster;
                const [longitude, latitude] = geometry.coordinates;

                // Si c'est un cluster
                if (properties.cluster) {
                  return (
                    <ClusterMarker
                      key={`cluster-${properties.cluster_id}`}
                      longitude={longitude}
                      latitude={latitude}
                      pointCount={properties.point_count || 0}
                      onClick={() => handleClusterClick(properties.cluster_id!, longitude, latitude)}
                    />
                  );
                }

                // Sinon c'est un marqueur individuel
                const listing = properties.listing as ListingItem;
                if (!listing) return null;

                // Calculate price if startAt/endAt are available
                let price: number | null = null;
                
                if (startAt && endAt) {
                  const listingForPricing: ListingForPricing = {
                    pricePerDay: listing.pricePerDay,
                    currency: listing.currency,
                    options: listing.options,
                  };
                  const priceCalc = calculateListingPrice(startAt, endAt, listingForPricing);
                  price = priceCalc?.finalPrice ?? null;
                }
                
                // Fallback to pricePerDay if no calculated price - always show marker with pricePerDay
                if (price == null) {
                  price =
                    listing.pricePerDay != null
                      ? typeof listing.pricePerDay === 'number'
                        ? listing.pricePerDay
                        : (listing.pricePerDay as { toNumber?: () => number })?.toNumber?.() ?? null
                      : null;
                }

                // Only skip marker if there's absolutely no price information
                if (price == null) return null;

                return (
                  <PricePillMarker
                    key={listing.id}
                    longitude={longitude}
                    latitude={latitude}
                    price={price}
                    currency={listing.currency || 'EUR'}
                    onClick={() => handleMarkerClick(listing.id)}
                    isSelected={selectedListingId === listing.id}
                    isHoveredByList={hoveredListingId === listing.id}
                    onHover={(hovered) => {
                      if (hovered) {
                        setHoveredListingId(listing.id);
                      } else if (hoveredListingId === listing.id) {
                        setHoveredListingId(null);
                      }
                    }}
                  />
                );
              })}
              {selectedListing && selectedListing.latitude != null && selectedListing.longitude != null && (
                <ListingMiniCard
                  listing={selectedListing}
                  longitude={selectedListing.longitude}
                  latitude={selectedListing.latitude}
                  onClose={() => setSelectedListingId(null)}
                  listingType={listingType}
                  startAt={startAt}
                  endAt={endAt}
                />
              )}
            </MapboxMap>
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
              <MapFullscreenButton
                isFullscreen={isMapFullscreen}
                onToggle={() => setIsMapFullscreen(!isMapFullscreen)}
                alwaysShow
                className="!relative !top-auto !right-auto"
              />
              <MapZoomControls mapRef={mapRef} className="!relative !top-auto !left-auto" />
            </div>
            {(loading || isMapLoading) && (
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium">
                {t('common.loading')}
              </div>
            )}
            {error && (
              <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Layout Mobile
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Carte en plein écran */}
      <div
        className={clsx('absolute inset-0 w-full h-full', {
          'pointer-events-none': !isMapInteractive,
        })}
      >
        <MapboxMap
          ref={mapRef}
          center={defaultCenter as [number, number]}
          zoom={listingsWithCoords.length === 1 ? 12 : mapZoom || 10}
          onMove={isMapInteractive ? handleMapMove : undefined}
          onMoveEnd={isMapInteractive ? handleMapMoveEnd : undefined}
          onLoad={() => {
            // Initialiser les bounds et le zoom au chargement de la carte
            if (mapRef.current) {
              const map = mapRef.current.getMap();
              if (map) {
                setMapZoom(map.getZoom());
                const bounds = map.getBounds();
                if (bounds) {
                  setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
                }
              }
            }
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {clusters.map((cluster) => {
            const { properties, geometry } = cluster;
            const [longitude, latitude] = geometry.coordinates;

            // Si c'est un cluster
            if (properties.cluster) {
              return (
                <ClusterMarker
                  key={`cluster-${properties.cluster_id}`}
                  longitude={longitude}
                  latitude={latitude}
                  pointCount={properties.point_count || 0}
                  onClick={() => handleClusterClick(properties.cluster_id!, longitude, latitude)}
                />
              );
            }

            // Sinon c'est un marqueur individuel
            const listing = properties.listing as ListingItem;
            if (!listing) return null;

            // Calculate price if startAt/endAt are available
            let price: number | null = null;
            
            if (startAt && endAt) {
              const listingForPricing: ListingForPricing = {
                pricePerDay: listing.pricePerDay,
                currency: listing.currency,
                options: listing.options,
              };
              const priceCalc = calculateListingPrice(startAt, endAt, listingForPricing);
              price = priceCalc?.finalPrice ?? null;
            }
            
            // Fallback to pricePerDay if no calculated price - always show marker with pricePerDay
            if (price == null) {
              price =
                listing.pricePerDay != null
                  ? typeof listing.pricePerDay === 'number'
                    ? listing.pricePerDay
                    : (listing.pricePerDay as { toNumber?: () => number })?.toNumber?.() ?? null
                  : null;
            }

            // Only skip marker if there's absolutely no price information
            if (price == null) return null;

            return (
              <PricePillMarker
                key={listing.id}
                longitude={longitude}
                latitude={latitude}
                price={price}
                currency={listing.currency || 'EUR'}
                onClick={() => handleMarkerClick(listing.id)}
                isSelected={selectedListingId === listing.id}
              />
            );
          })}
          {/* Popup désactivée - ne s'affiche plus au clic sur marqueur */}
        </MapboxMap>
        {(loading || isMapLoading) && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium z-10">
            {t('common.loading')}
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md text-sm z-10">
            {error}
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <ListingsBottomSheet
        onStateChange={handleSheetStateChange}
        initialState="peek"
        onMapInteractivityChange={setIsMapInteractive}
      >
        <ListingsGrid
          listingType={listingType}
          selectedListingId={selectedListingId}
          onListingClick={handleListingClick}
          listings={listings}
        />
      </ListingsBottomSheet>

      {/* Bouton "Carte" flottant (visible quand sheet n'est pas en peek) */}
      {sheetState !== 'peek' && (
        <button
          onClick={handleShowMap}
          className="fixed bottom-24 right-4 z-40 bg-black text-white px-4 py-2 rounded-full shadow-lg font-medium hover:bg-gray-800 transition-colors"
          aria-label="Afficher la carte"
        >
          Carte
        </button>
      )}
    </div>
  );
}
