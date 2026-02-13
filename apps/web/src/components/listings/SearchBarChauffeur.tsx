'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

export function SearchBarChauffeur() {
  const t = useTranslations('searchChauffeur');
  const router = useRouter();
  const countryCodes = useActiveMarketCountryCodes();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('city') ?? searchParams.get('q') ?? '');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  
  // Support both old format (date/time/duration) and new format (startAt/endAt)
  const urlStartAt = searchParams.get('startAt') ?? '';
  const urlEndAt = searchParams.get('endAt') ?? '';
  const urlDate = searchParams.get('date') ?? '';
  const urlTime = searchParams.get('time') ?? '';
  const urlDuration = searchParams.get('duration') ?? '';
  
  // Convert old format to datetime-local format if needed
  const toDateTimeLocal = (dateStr: string, timeStr?: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.slice(0, 16); // Already datetime format
    if (dateStr.length === 10) {
      // Date only, add time if provided, otherwise default to 09:00
      const time = timeStr || '09:00';
      return `${dateStr}T${time}`;
    }
    return dateStr;
  };
  
  // Initialize startAt from URL or combine date+time
  const [startAt, setStartAt] = useState(() => {
    if (urlStartAt) return toDateTimeLocal(urlStartAt);
    if (urlDate) return toDateTimeLocal(urlDate, urlTime);
    return '';
  });
  
  // Initialize endAt from URL or calculate from startAt + duration
  const [endAt, setEndAt] = useState(() => {
    if (urlEndAt) return toDateTimeLocal(urlEndAt);
    if (startAt && urlDuration) {
      const start = new Date(startAt);
      const hours = parseInt(urlDuration, 10) || 1;
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      return end.toISOString().slice(0, 16);
    }
    return '';
  });
  
  // Keep duration for backward compatibility and convenience
  const [duration, setDuration] = useState(urlDuration);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('type', 'CHAUFFEUR');
    
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
    
    // Use startAt/endAt format (ISO datetime) as primary
    if (startAt) {
      const startDateObj = new Date(startAt);
      if (!isNaN(startDateObj.getTime())) {
        params.set('startAt', startDateObj.toISOString());
      }
    }
    if (endAt) {
      const endDateObj = new Date(endAt);
      if (!isNaN(endDateObj.getTime())) {
        params.set('endAt', endDateObj.toISOString());
      }
    }
    
    // Keep duration for backward compatibility
    if (duration.trim()) params.set('duration', duration.trim());
    router.push(`/${locale}/ride?${params.toString()}`);
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
          type="datetime-local"
          value={startAt}
          onChange={(e) => {
            setStartAt(e.target.value);
            // Auto-update endAt if duration is set
            if (e.target.value && duration) {
              const start = new Date(e.target.value);
              const hours = parseInt(duration, 10) || 1;
              const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
              setEndAt(end.toISOString().slice(0, 16));
            }
          }}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          min={new Date().toISOString().slice(0, 16)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('duration')}</span>
        <input
          type="number"
          min={1}
          placeholder="h"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value);
            // Auto-update endAt if startAt is set
            if (startAt && e.target.value) {
              const start = new Date(startAt);
              const hours = parseInt(e.target.value, 10) || 1;
              const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
              setEndAt(end.toISOString().slice(0, 16));
            }
          }}
          className="w-20 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('endDate') || 'Fin'}</span>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          min={startAt || new Date().toISOString().slice(0, 16)}
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
