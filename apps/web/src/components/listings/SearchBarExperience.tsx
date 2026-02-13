'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

export function SearchBarExperience() {
  const t = useTranslations('searchExperience');
  const router = useRouter();
  const countryCodes = useActiveMarketCountryCodes();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('city') ?? searchParams.get('q') ?? '');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [date, setDate] = useState(searchParams.get('date') ?? '');
  const [duration, setDuration] = useState(searchParams.get('duration') ?? '');

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('type', 'MOTORIZED_EXPERIENCE');
    
    if (selectedAddress) {
      // Use coordinates for precise geographic search
      params.set('lat', selectedAddress.latitude.toString());
      params.set('lng', selectedAddress.longitude.toString());
      if (selectedAddress.city) params.set('city', selectedAddress.city);
      if (selectedAddress.country) params.set('country', selectedAddress.country);
    } else if (place.trim()) {
      // Fallback to text search
      params.set('city', place.trim());
    }
    
    if (date) params.set('date', date);
    if (duration.trim()) params.set('duration', duration.trim());
    router.push(`/${locale}/experience?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex flex-1 min-w-[200px] flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('placeholder')}</span>
        <AddressAutocomplete
          value={place}
          onChange={setPlace}
          onSelect={handleSelect}
          placeholder={t('placeholder')}
          allowedCountryCodes={countryCodes.length > 0 ? countryCodes : undefined}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('date')}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('duration')}</span>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="ex: 2h"
          className="w-28 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:opacity-90"
      >
        {t('button')}
      </button>
    </form>
  );
}
