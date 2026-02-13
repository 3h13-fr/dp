'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type VehicleMake = { id: string; name: string; slug: string };
export type VehicleModel = { id: string; name: string; slug: string; makeId: string };

type VehicleAutocompleteProps = {
  value: string; // ID of selected make or model
  onChange: (id: string) => void;
  onSelect?: (item: VehicleMake | VehicleModel) => void;
  type: 'make' | 'model';
  makeId?: string; // Required for model type
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
};

export function VehicleAutocomplete({
  value,
  onChange,
  onSelect,
  type,
  makeId,
  placeholder,
  className = '',
  inputClassName,
  disabled = false,
  required = false,
  label,
}: VehicleAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<(VehicleMake | VehicleModel)[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<VehicleMake | VehicleModel | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load all items initially and when makeId changes (for models)
  useEffect(() => {
    if (type === 'model' && !makeId) {
      setSuggestions([]);
      setSelectedItem(null);
      setSearchQuery('');
      return;
    }

    const url = type === 'make' 
      ? `${API_URL}/vehicles/makes`
      : `${API_URL}/vehicles/makes/${makeId}/models`;

    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error('Failed to fetch');
        }
        return r.json();
      })
      .then((d: { items?: (VehicleMake | VehicleModel)[] }) => {
        if (d?.items) {
          setSuggestions(d.items);
          // Find and set selected item if value is provided
          if (value) {
            const found = d.items.find((item) => item.id === value);
            if (found) {
              setSelectedItem(found);
              setSearchQuery(found.name);
            } else {
              // Value provided but not found in list - clear selection
              setSelectedItem(null);
              setSearchQuery('');
            }
          } else {
            // No value - clear selection
            setSelectedItem(null);
            setSearchQuery('');
          }
        }
      })
      .catch((err) => {
        console.error(`Error fetching ${type}s:`, err);
        setSuggestions([]);
        setError('Failed to load options');
      });
  }, [type, makeId, value]);

  // Filter suggestions based on search query
  const filteredSuggestions = searchQuery.trim().length >= 1
    ? suggestions.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestions;

  // Debounced search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Filtering is done in filteredSuggestions, no need for API call
      setShowSuggestions(searchQuery.trim().length >= 1 && filteredSuggestions.length > 0);
    }, 150);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, filteredSuggestions.length]);

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

  const handleSelect = (item: VehicleMake | VehicleModel) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowSuggestions(false);
    onChange(item.id);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    // Clear selection if user is typing
    if (selectedItem && newValue !== selectedItem.name) {
      setSelectedItem(null);
      onChange('');
    }
    if (newValue.trim().length >= 1) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const displayValue = selectedItem ? selectedItem.name : searchQuery;

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: showSuggestions ? 1000 : 'auto' }}>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder || (type === 'make' ? 'Rechercher une marque...' : 'Rechercher un modèle...')}
        disabled={disabled || (type === 'model' && !makeId)}
        required={required}
        className={inputClassName || "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-sm text-muted-foreground">...</span>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-[1000] top-full left-0 right-0 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white shadow-xl" style={{ position: 'absolute' }}>
          {filteredSuggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => handleSelect(item)}
              className="cursor-pointer px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <div className="font-medium text-foreground">{item.name}</div>
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && !loading && filteredSuggestions.length === 0 && searchQuery.trim().length >= 1 && (
        <ul className="absolute z-[1000] top-full left-0 right-0 mt-1 w-full rounded-lg border border-border bg-white shadow-xl" style={{ position: 'absolute' }}>
          <li className="px-4 py-2 text-sm text-muted-foreground">Aucun résultat trouvé</li>
        </ul>
      )}
    </div>
  );
}
