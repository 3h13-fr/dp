'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchCity } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ListingTypeParam = 'CAR_RENTAL' | 'CHAUFFEUR' | 'MOTORIZED_EXPERIENCE';

export type ListingItem = {
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
  options?: { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null }; delivery?: { available?: boolean } } | null;
};

type SearchState =
  | { status: 'idle' }
  | { status: 'resolving-city'; city: string }
  | { status: 'searching'; coordinates: { lat: number; lng: number }; radius: number }
  | { status: 'success'; listings: ListingItem[]; total: number }
  | { status: 'error'; error: string };

export function useSearchListings(listingType: ListingTypeParam) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track if we started without geographic parameters (to prevent map moves from triggering searches)
  const hadInitialGeoParamsRef = useRef<boolean>(false);

  useEffect(() => {
    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const city = searchParams.get('city') ?? searchParams.get('q') ?? '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const startAt = searchParams.get('startAt');
    const endAt = searchParams.get('endAt');
    const country = searchParams.get('country');
    const category = searchParams.get('category');
    const transmission = searchParams.get('transmission');
    const fuelType = searchParams.get('fuelType');
    const sortBy = searchParams.get('sortBy');

    // Vérifier si on a des paramètres géographiques initiaux
    const hasGeoParams = !!(city || lat || lng);
    if (hasGeoParams && !hadInitialGeoParamsRef.current) {
      // Marquer qu'on a maintenant des paramètres géographiques
      hadInitialGeoParamsRef.current = true;
    }

    // Si pas de paramètres de recherche, faire une recherche par défaut pour afficher tous les listings
    if (!city && !lat && !lng) {
      // Si on n'avait pas de paramètres géographiques initialement et qu'on n'en a toujours pas,
      // c'est qu'on est dans l'état initial - afficher tous les listings
      if (!hadInitialGeoParamsRef.current) {
        performSearch();
        return;
      }
      // Si on avait des paramètres géographiques mais qu'ils ont été supprimés, réinitialiser
      hadInitialGeoParamsRef.current = false;
      performSearch();
      return;
    }

    // Si on a des coordonnées, faire la recherche directement
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const radius = parseInt(searchParams.get('radius') ?? '20000', 10);
        
        // Si on n'avait pas de paramètres géographiques initialement et qu'on a maintenant des coordonnées,
        // c'est probablement dû à un mouvement de carte - utiliser un rayon très large pour éviter de perdre les résultats
        if (!hadInitialGeoParamsRef.current) {
          // Utiliser un rayon très large (100km) pour ne pas perdre les résultats lors du premier mouvement de carte
          performSearch(latNum, lngNum, Math.max(radius, 100000));
          hadInitialGeoParamsRef.current = true;
          return;
        }
        
        performSearch(latNum, lngNum, radius);
        return;
      }
    }

    // Si on a une ville mais pas de coordonnées, résoudre d'abord
    if (city && !lat && !lng) {
      resolveCityAndSearch(city);
      return;
    }

    // Sinon, recherche sans coordonnées (backend gérera)
    performSearch();

    async function resolveCityAndSearch(cityName: string) {
      setState({ status: 'resolving-city', city: cityName });

      try {
        const cityData = await searchCity(cityName);

        if (!cityData?.latitude || !cityData?.longitude) {
          console.warn('[useSearchListings] City not found:', cityName);
          setState({ status: 'error', error: `Ville "${cityName}" non trouvée` });
          return;
        }

        console.log('[useSearchListings] City resolved:', {
          cityName,
          latitude: cityData.latitude,
          longitude: cityData.longitude,
        });

        // Mettre à jour l'URL avec les coordonnées
        // Le useEffect se déclenchera automatiquement avec les nouvelles coordonnées
        const newParams = new URLSearchParams(searchParams.toString());
        // Toujours conserver/mettre le paramètre city dans l'URL pour le fallback backend
        newParams.set('city', cityName);
        newParams.set('lat', cityData.latitude.toString());
        newParams.set('lng', cityData.longitude.toString());
        if (!newParams.get('radius')) {
          newParams.set('radius', '20000');
        }
        console.log('[useSearchListings] Updating URL with coordinates:', {
          city: cityName,
          lat: cityData.latitude,
          lng: cityData.longitude,
          newUrl: `?${newParams.toString()}`,
        });
        router.replace(`?${newParams.toString()}`, { scroll: false });
        
        // Ne pas appeler performSearch ici - le useEffect se déclenchera automatiquement
        // avec les nouvelles coordonnées dans l'URL
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Requête annulée, ignorer
        }
        console.error('[useSearchListings] Error resolving city:', error);
        setState({ status: 'error', error: 'Erreur lors de la résolution de la ville' });
      }
    }

    async function performSearch(lat?: number, lng?: number, radius = 20000) {
      if (lat !== undefined && lng !== undefined) {
        setState({ status: 'searching', coordinates: { lat, lng }, radius });
      } else {
        setState({ status: 'searching', coordinates: { lat: 0, lng: 0 }, radius: 0 });
      }

      const params = new URLSearchParams();
      params.set('type', listingType);

      if (lat !== undefined && lng !== undefined) {
        params.set('lat', lat.toString());
        params.set('lng', lng.toString());
        params.set('radius', radius.toString());
      }

      if (city) params.set('city', city);
      if (startAt) params.set('startAt', startAt);
      if (endAt) params.set('endAt', endAt);
      if (country?.trim()) params.set('country', country.trim());
      if (category?.trim()) params.set('category', category.trim());
      if (transmission?.trim()) params.set('transmission', transmission.trim());
      if (fuelType?.trim()) params.set('fuelType', fuelType.trim());
      if (sortBy?.trim()) params.set('sortBy', sortBy.trim());

      params.set('limit', '100'); // Plus de résultats pour la carte

      try {
        const url = `${API_URL}/listings?${params.toString()}`;
        console.log('[useSearchListings] Fetching listings:', url);
        
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[useSearchListings] Received listings:', {
          itemsCount: data.items?.length ?? 0,
          total: data.total ?? 0,
        });
        
        setState({
          status: 'success',
          listings: data.items ?? [],
          total: data.total ?? 0,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Requête annulée, ignorer
        }
        console.error('[useSearchListings] Error fetching listings:', error);
        setState({ status: 'error', error: 'Erreur lors de la recherche' });
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    // Dépendre des valeurs individuelles pour éviter les re-renders excessifs
    searchParams.get('city'),
    searchParams.get('q'),
    searchParams.get('lat'),
    searchParams.get('lng'),
    searchParams.get('radius'),
    searchParams.get('startAt'),
    searchParams.get('endAt'),
    searchParams.get('country'),
    searchParams.get('category'),
    searchParams.get('transmission'),
    searchParams.get('fuelType'),
    searchParams.get('sortBy'),
    listingType,
    router,
  ]);

  return {
    state,
    listings: state.status === 'success' ? state.listings : [],
    total: state.status === 'success' ? state.total : 0,
    loading: state.status === 'resolving-city' || state.status === 'searching',
    error: state.status === 'error' ? state.error : null,
  };
}
