'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

export function SearchBarLocation() {
  const t = useTranslations('searchLocation');
  const router = useRouter();
  const countryCodes = useActiveMarketCountryCodes();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('city') ?? searchParams.get('q') ?? '');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  // Support both old format (startDate/endDate) and new format (startAt/endAt)
  const urlStartAt = searchParams.get('startAt') ?? '';
  const urlEndAt = searchParams.get('endAt') ?? '';
  const urlStartDate = searchParams.get('startDate') ?? '';
  const urlEndDate = searchParams.get('endDate') ?? '';
  
  // Convert old format to datetime-local format if needed
  const toDateTimeLocal = (dateStr: string, timeStr?: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.slice(0, 16); // Already datetime format
    if (dateStr.length === 10) {
      // Date only, add default time (09:00)
      return `${dateStr}T09:00`;
    }
    return dateStr;
  };
  
  const [startAt, setStartAt] = useState(() => {
    if (urlStartAt) return toDateTimeLocal(urlStartAt);
    if (urlStartDate) return toDateTimeLocal(urlStartDate);
    return '';
  });
  const [endAt, setEndAt] = useState(() => {
    if (urlEndAt) return toDateTimeLocal(urlEndAt);
    if (urlEndDate) return toDateTimeLocal(urlEndDate);
    return '';
  });
  const [seats, setSeats] = useState(searchParams.get('seats') ?? '');

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('type', 'CAR_RENTAL');
    
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
    
    // Use startAt/endAt format (ISO datetime)
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
    if (seats.trim()) params.set('seats', seats.trim());
    router.push(`/${locale}/location?${params.toString()}`);
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
        <span className="text-sm text-muted-foreground">{t('startDate')}</span>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          min={new Date().toISOString().slice(0, 16)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('endDate')}</span>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          min={startAt || new Date().toISOString().slice(0, 16)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('seats')}</span>
        <input
          type="number"
          min={1}
          max={9}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          placeholder="—"
          className="w-20 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
