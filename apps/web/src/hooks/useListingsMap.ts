'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewStateChangeEvent } from 'react-map-gl';
import { MapRef } from 'react-map-gl';

type MapCenter = {
  longitude: number;
  latitude: number;
};

type UseListingsMapOptions = {
  initialCenter?: MapCenter;
  mapRef?: React.RefObject<MapRef>;
  onSearchUpdate?: (center: MapCenter, bounds: { north: number; south: number; east: number; west: number }) => void;
};

export function useListingsMap({ initialCenter, mapRef, onSearchUpdate }: UseListingsMapOptions = {}) {
  const defaultCenter = initialCenter || { longitude: 2.3522, latitude: 48.8566 }; // Paris par défaut
  const [mapCenter, setMapCenter] = useState<MapCenter>(defaultCenter);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const initialCenterRef = useRef<MapCenter>(defaultCenter);

  // Mettre à jour initialCenterRef quand initialCenter change
  useEffect(() => {
    if (initialCenter) {
      initialCenterRef.current = initialCenter;
      setMapCenter(initialCenter);
    }
  }, [initialCenter]);

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const newCenter = {
        longitude: evt.viewState.longitude,
        latitude: evt.viewState.latitude,
      };
      setMapCenter(newCenter);

      // Calculer la distance depuis la position initiale
      const distance = calculateDistance(
        initialCenterRef.current.latitude,
        initialCenterRef.current.longitude,
        newCenter.latitude,
        newCenter.longitude,
      );

      // Afficher le bouton si déplacé de plus de 100m
      if (distance > 100) {
        setShowRefreshButton(true);
      } else {
        setShowRefreshButton(false);
      }
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    if (!mapRef?.current) {
      // Fallback : utiliser les coordonnées actuelles avec un rayon approximatif
      const bounds = {
        north: mapCenter.latitude + 0.1,
        south: mapCenter.latitude - 0.1,
        east: mapCenter.longitude + 0.1,
        west: mapCenter.longitude - 0.1,
      };
      initialCenterRef.current = mapCenter;
      setShowRefreshButton(false);
      onSearchUpdate?.(mapCenter, bounds);
      return;
    }

    const map = mapRef.current.getMap();
    if (!map) return;

    const center = map.getCenter();
    const bounds = map.getBounds();
    if (!bounds) return;

    const newCenter = {
      longitude: center.lng,
      latitude: center.lat,
    };

    const mapBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };

    // Mettre à jour la référence de la position initiale
    initialCenterRef.current = newCenter;
    setMapCenter(newCenter);
    setShowRefreshButton(false);

    // Déclencher la recherche
    onSearchUpdate?.(newCenter, mapBounds);
  }, [onSearchUpdate, mapRef, mapCenter]);

  return {
    mapCenter,
    showRefreshButton,
    handleMoveEnd,
    handleRefresh,
  };
}

// Calcul de distance en mètres entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
