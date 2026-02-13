'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Country = {
  id?: string;
  code: string;
  slug?: string;
  name: Record<string, string> | string;
};

/** Static fallback for common market countries when DB has few entries */
const FALLBACK_COUNTRIES: Country[] = [
  { code: 'FR', name: { en: 'France', fr: 'France' } },
  { code: 'BE', name: { en: 'Belgium', fr: 'Belgique' } },
  { code: 'CH', name: { en: 'Switzerland', fr: 'Suisse' } },
  { code: 'LU', name: { en: 'Luxembourg', fr: 'Luxembourg' } },
  { code: 'DE', name: { en: 'Germany', fr: 'Allemagne' } },
  { code: 'ES', name: { en: 'Spain', fr: 'Espagne' } },
  { code: 'IT', name: { en: 'Italy', fr: 'Italie' } },
  { code: 'NL', name: { en: 'Netherlands', fr: 'Pays-Bas' } },
  { code: 'GB', name: { en: 'United Kingdom', fr: 'Royaume-Uni' } },
  { code: 'US', name: { en: 'United States', fr: 'États-Unis' } },
];

function getCountryLabel(country: Country, locale: string): string {
  const name = country.name;
  if (typeof name === 'string') return name;
  return (name[locale === 'fr' ? 'fr' : 'en'] || name.en || name.fr || country.code) as string;
}

type CountrySelectProps = {
  value: string;
  onChange: (code: string, label?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  locale?: string;
};

export function CountrySelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Sélectionner un pays',
  className = '',
  locale: localeProp,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = localeProp ?? (typeof window !== 'undefined' ? document.documentElement.lang || 'fr' : 'fr');

  useEffect(() => {
    apiFetch('/geo/countries')
      .then((res) => res.json())
      .then((data: Country[]) => {
        const fromDb = Array.isArray(data) ? data : [];
        const byCode = new Map<string, Country>();
        for (const c of FALLBACK_COUNTRIES) {
          byCode.set(c.code.toUpperCase(), { ...c, code: c.code.toUpperCase() });
        }
        for (const c of fromDb) {
          if (c?.code) byCode.set(c.code.toUpperCase(), { ...c, code: c.code.toUpperCase() });
        }
        setCountries(Array.from(byCode.values()).sort((a, b) => (getCountryLabel(a, locale) || '').localeCompare(getCountryLabel(b, locale) || '')));
      })
      .catch(() => setCountries(FALLBACK_COUNTRIES))
      .finally(() => setLoading(false));
  }, [locale]);

  const selectedCountry = useMemo(() => countries.find((c) => c.code.toUpperCase() === value?.toUpperCase()), [countries, value]);

  const filteredCountries = useMemo(() => {
    if (!inputValue.trim()) return countries;
    const q = inputValue.toLowerCase();
    return countries.filter((c) => {
      const label = getCountryLabel(c, locale).toLowerCase();
      return label.includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [countries, inputValue, locale]);

  const handleSelect = useCallback(
    (country: Country) => {
      onChange(country.code.toUpperCase(), getCountryLabel(country, locale));
      setInputValue('');
      setOpen(false);
    },
    [onChange, locale]
  );

  const displayValue = open ? inputValue : selectedCountry ? `${getCountryLabel(selectedCountry, locale)} (${selectedCountry.code})` : '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
      />
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-background shadow-md">
          {filteredCountries.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Aucun pays trouvé</li>
          ) : (
            filteredCountries.map((c) => (
              <li
                key={c.code}
                role="option"
                tabIndex={0}
                onClick={() => handleSelect(c)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(c)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-muted ${c.code.toUpperCase() === value?.toUpperCase() ? 'bg-muted' : ''}`}
              >
                {getCountryLabel(c, locale)} ({c.code})
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
