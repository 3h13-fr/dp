'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewStateChangeEvent } from 'react-map-gl';
import { MapRef } from 'react-map-gl';

type MapCenter = {
  longitude: number;
  latitude: number;
};

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type UseMapDrivenSearchOptions = {
  initialCenter?: MapCenter;
  mapRef?: React.RefObject<MapRef>;
  onBoundsChange?: (center: MapCenter, bounds: MapBounds, radiusMeters: number) => void;
  debounceMs?: number;
};

/**
 * Hook pour gérer la recherche map-driven avec debounce et calcul de bounds
 * Écoute les événements moveend et zoomend de la carte et déclenche des callbacks
 * avec debounce pour éviter trop de requêtes pendant le pan/zoom
 */
export function useMapDrivenSearch({
  initialCenter,
  mapRef,
  onBoundsChange,
  debounceMs = 300,
}: UseMapDrivenSearchOptions = {}) {
  const defaultCenter = initialCenter || { longitude: 2.3522, latitude: 48.8566 }; // Paris par défaut
  const [mapCenter, setMapCenter] = useState<MapCenter>(defaultCenter);
  const [isLoading, setIsLoading] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastBoundsRef = useRef<MapBounds | null>(null);

  // Calculer le rayon en mètres depuis les bounds
  const calculateRadiusFromBounds = useCallback((bounds: MapBounds): number => {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const avgLat = (bounds.north + bounds.south) / 2;
    const calculatedRadius = Math.max(
      (latDiff * 111000) / 2, // 1 degré lat ≈ 111km
      (lngDiff * 111000 * Math.cos((avgLat * Math.PI) / 180)) / 2,
    );
    // Enforcer un rayon minimum de 20km pour éviter des recherches trop restrictives
    const radiusMeters = Math.max(calculatedRadius, 20000);
    return Math.round(radiusMeters);
  }, []);

  // Obtenir les bounds de la carte
  const getMapBounds = useCallback((): MapBounds | null => {
    if (!mapRef?.current) return null;
    
    const map = mapRef.current.getMap();
    if (!map) return null;

    const bounds = map.getBounds();
    if (!bounds) return null;
    
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }, [mapRef]);

  // Obtenir le centre de la carte
  const getMapCenter = useCallback((): MapCenter | null => {
    if (!mapRef?.current) return null;
    
    const map = mapRef.current.getMap();
    if (!map) return null;

    const center = map.getCenter();
    return {
      longitude: center.lng,
      latitude: center.lat,
    };
  }, [mapRef]);

  // Déclencher le callback avec les nouvelles bounds
  const triggerBoundsChange = useCallback(() => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const bounds = getMapBounds();
    const center = getMapCenter();
    
    if (!bounds || !center) return;

    // Éviter de déclencher si les bounds n'ont pas changé significativement
    const lastBounds = lastBoundsRef.current;
    if (lastBounds) {
      const latDiff = Math.abs(bounds.north - lastBounds.north) + Math.abs(bounds.south - lastBounds.south);
      const lngDiff = Math.abs(bounds.east - lastBounds.east) + Math.abs(bounds.west - lastBounds.west);
      // Si le changement est inférieur à ~100m, ignorer
      if (latDiff < 0.001 && lngDiff < 0.001) {
        return;
      }
    }

    lastBoundsRef.current = bounds;
    setMapCenter(center);
    setIsLoading(true);

    const radiusMeters = calculateRadiusFromBounds(bounds);
    
    // Créer un nouvel AbortController pour cette requête
    abortControllerRef.current = new AbortController();

    // Déclencher le callback
    onBoundsChange?.(center, bounds, radiusMeters);
    
    // Simuler la fin du chargement après un court délai
    // (le vrai chargement sera géré par le composant parent)
    setTimeout(() => setIsLoading(false), 100);
  }, [getMapBounds, getMapCenter, calculateRadiusFromBounds, onBoundsChange]);

  // Handler pour moveend et zoomend avec debounce
  const handleMapMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      // Annuler le timer précédent
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Mettre à jour le centre immédiatement pour l'UI
      const newCenter = {
        longitude: evt.viewState.longitude,
        latitude: evt.viewState.latitude,
      };
      setMapCenter(newCenter);

      // Débouncer le déclenchement du callback
      debounceTimerRef.current = setTimeout(() => {
        triggerBoundsChange();
      }, debounceMs);
    },
    [debounceMs, triggerBoundsChange],
  );

  // Nettoyer les timers et abort controllers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fonction pour forcer un refresh manuel
  const refresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    triggerBoundsChange();
  }, [triggerBoundsChange]);

  // Fonction pour obtenir les bounds actuelles (sans déclencher de callback)
  const getCurrentBounds = useCallback((): { center: MapCenter; bounds: MapBounds; radiusMeters: number } | null => {
    const bounds = getMapBounds();
    const center = getMapCenter();
    
    if (!bounds || !center) return null;

    const radiusMeters = calculateRadiusFromBounds(bounds);
    return { center, bounds, radiusMeters };
  }, [getMapBounds, getMapCenter, calculateRadiusFromBounds]);

  return {
    mapCenter,
    isLoading,
    handleMapMoveEnd,
    refresh,
    getCurrentBounds,
    abortController: abortControllerRef.current,
  };
}
