'use client';

import { useMemo } from 'react';
import Supercluster from 'supercluster';

type ListingWithCoords = {
  id: string;
  latitude: number;
  longitude: number;
  [key: string]: unknown;
};

type ClusterFeature = {
  type: 'Feature';
  id?: number | string;
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
    listing?: ListingWithCoords;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

type UseMarkerClusteringOptions = {
  listings: ListingWithCoords[];
  zoom: number;
  bounds?: [number, number, number, number] | null; // [west, south, east, north]
  radius?: number;
  maxZoom?: number;
  minZoom?: number;
};

/**
 * Hook pour gérer le clustering des marqueurs sur la carte
 * Utilise supercluster pour regrouper les marqueurs proches
 */
export function useMarkerClustering({
  listings,
  zoom,
  bounds,
  radius = 60,
  maxZoom = 16,
  minZoom = 0,
}: UseMarkerClusteringOptions): ClusterFeature[] {
  // Créer l'instance supercluster avec les listings
  const cluster = useMemo(() => {
    const sc = new Supercluster({
      radius,
      maxZoom, // Au-delà de ce zoom, les points individuels sont retournés
      minZoom,
      extent: 512, // Taille du tile (défaut: 512)
      nodeSize: 64, // Taille du nœud dans l'arbre (défaut: 64)
    });

    // Convertir les listings en GeoJSON features
    const points = listings
      .filter((l) => l.latitude != null && l.longitude != null && !Number.isNaN(l.latitude) && !Number.isNaN(l.longitude))
      .map((listing) => ({
        type: 'Feature' as const,
        properties: { listing },
        geometry: {
          type: 'Point' as const,
          coordinates: [listing.longitude, listing.latitude] as [number, number],
        },
      }));

    sc.load(points);
    return sc;
  }, [listings, radius, maxZoom, minZoom]);

  // Obtenir les clusters pour le niveau de zoom actuel
  const clusters = useMemo(() => {
    if (!bounds) {
      // Si pas de bounds, utiliser les bounds du monde entier
      return cluster.getClusters([-180, -85, 180, 85], Math.floor(zoom));
    }
    return cluster.getClusters(bounds, Math.floor(zoom));
  }, [cluster, zoom, bounds]);

  return clusters as ClusterFeature[];
}
