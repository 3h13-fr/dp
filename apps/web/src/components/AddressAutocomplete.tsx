'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export type AddressSuggestion = {
  address: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type MapboxFeature = {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
};

type MapboxResponse = {
  features: MapboxFeature[];
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  onError?: (error: string | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  hideInlineError?: boolean;
  /** Restrict suggestions to these country codes (e.g. from active markets). Mapbox country parameter. */
  allowedCountryCodes?: string[];
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onError,
  placeholder = 'Enter an address, city...',
  className = '',
  inputClassName,
  disabled = false,
  required = false,
  hideInlineError = false,
  allowedCountryCodes,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract city and country from Mapbox context
  const extractLocationData = (feature: MapboxFeature): AddressSuggestion => {
    const [longitude, latitude] = feature.center;
    let city: string | undefined;
    let country: string | undefined;

    if (feature.context) {
      // Find city (place context)
      const placeContext = feature.context.find((ctx) => ctx.id.startsWith('place.'));
      if (placeContext) {
        city = placeContext.text;
      }

      // Find country (country context)
      const countryContext = feature.context.find((ctx) => ctx.id.startsWith('country.'));
      if (countryContext) {
        country = countryContext.short_code || countryContext.text;
      }
    }

    return {
      address: feature.place_name,
      city,
      country,
      latitude,
      longitude,
    };
  };

  // Fetch suggestions from Mapbox Geocoding API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      const errorMessage = 'Mapbox access token is not configured';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      return;
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&types=place,address,poi`;
      if (allowedCountryCodes && allowedCountryCodes.length > 0) {
        url += `&country=${allowedCountryCodes.map((c) => encodeURIComponent(c)).join(',')}`;
      }

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: MapboxResponse = await response.json();
      const mappedSuggestions = data.features.map(extractLocationData);
      setSuggestions(mappedSuggestions);
      setShowSuggestions(mappedSuggestions.length > 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Error fetching address suggestions:', err);
      const errorMessage = 'Failed to load suggestions';
      setError(errorMessage);
      setSuggestions([]);
      setShowSuggestions(false);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [onError, allowedCountryCodes]);

  // Debounced search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.address);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (newValue.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: showSuggestions ? 1000 : 'auto' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClassName || "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-sm text-muted-foreground">...</span>
        </div>
      )}
      {error && !hideInlineError && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-[1000] top-full left-0 right-0 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white shadow-xl" style={{ position: 'absolute' }}>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="cursor-pointer px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <div className="font-medium text-foreground">{suggestion.address}</div>
              {(suggestion.city || suggestion.country) && (
                <div className="text-xs text-muted-foreground">
                  {[suggestion.city, suggestion.country].filter(Boolean).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && !loading && suggestions.length === 0 && value.trim().length >= 2 && (
        <ul className="absolute z-[1000] top-full left-0 right-0 mt-1 w-full rounded-lg border border-border bg-white shadow-xl" style={{ position: 'absolute' }}>
          <li className="px-4 py-2 text-sm text-muted-foreground">No suggestions found</li>
        </ul>
      )}
    </div>
  );
}
