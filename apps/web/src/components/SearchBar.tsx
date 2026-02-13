'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from './AddressAutocomplete';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

export function SearchBar() {
  const t = useTranslations('home');
  const router = useRouter();
  const locale = useLocale();
  const countryCodes = useActiveMarketCountryCodes();
  const [query, setQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (selectedAddress) {
      // Use coordinates for precise search
      params.set('lat', selectedAddress.latitude.toString());
      params.set('lng', selectedAddress.longitude.toString());
      params.set('radius', '20000'); // 20km par défaut pour les recherches d'adresse
      if (selectedAddress.city) params.set('city', selectedAddress.city);
      if (selectedAddress.country) params.set('country', selectedAddress.country);
    } else if (query.trim()) {
      // Fallback to text search if no address selected
      params.set('q', query.trim());
    }
    
    router.push(`/${locale}/location?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <AddressAutocomplete
          value={query}
          onChange={setQuery}
          onSelect={handleSelect}
          placeholder={t('searchPlaceholder')}
          allowedCountryCodes={countryCodes.length > 0 ? countryCodes : undefined}
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
      >
        {t('searchButton')}
      </button>
    </form>
  );
}
