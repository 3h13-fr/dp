'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export type HomeSearchType = 'location' | 'experience' | 'ride';

export function HomeSearchBar() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const locale = useLocale();
  const [searchType, setSearchType] = useState<HomeSearchType>('location');
  const [city, setCity] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const todayDateTime = new Date().toISOString().slice(0, 16);
  const needsTime = searchType === 'location' || searchType === 'ride';
  
  // Convert date to datetime-local format if needed
  const toDateTimeLocal = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.slice(0, 16); // Already datetime format
    if (dateStr.length === 10) {
      // Date only, add default time (09:00)
      return `${dateStr}T09:00`;
    }
    return dateStr;
  };
  
  // Convert datetime-local to date for experience
  const toDate = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    return dateTimeStr.slice(0, 10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (startAt) {
      if (needsTime) {
        // For location and ride, use ISO datetime format
        const startDateObj = new Date(startAt);
        if (!isNaN(startDateObj.getTime())) {
          params.set('startAt', startDateObj.toISOString());
        }
      } else {
        // For experience, use date only
        params.set('date', startAt);
      }
    }
    if (endAt && needsTime) {
      const endDateObj = new Date(endAt);
      if (!isNaN(endDateObj.getTime())) {
        params.set('endAt', endDateObj.toISOString());
      }
    }
    const path = searchType === 'location' ? 'location' : searchType === 'experience' ? 'experience' : 'ride';
    router.push(`/${locale}/${path}?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        <span className="sr-only">{t('filter')}</span>
        {(['location', 'experience', 'ride'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSearchType(type)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              searchType === type
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
            }`}
          >
            {type === 'location' ? tNav('vehicles') : type === 'experience' ? tNav('experiences') : tNav('ride')}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="home-search-city" className="sr-only">
            {t('searchPlaceholder')}
          </label>
          <input
            id="home-search-city"
            type="text"
            placeholder={t('searchPlaceholder')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div>
            <label htmlFor="home-search-start" className="block text-xs font-medium text-muted-foreground mb-1">
              {t('startDate')}
            </label>
            <input
              id="home-search-start"
              type={needsTime ? "datetime-local" : "date"}
              value={needsTime ? toDateTimeLocal(startAt) : toDate(startAt)}
              onChange={(e) => setStartAt(e.target.value)}
              min={needsTime ? todayDateTime : today}
              className="rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {(needsTime || searchType === 'location') && (
            <div>
              <label htmlFor="home-search-end" className="block text-xs font-medium text-muted-foreground mb-1">
                {t('returnDate')}
              </label>
              <input
                id="home-search-end"
                type={needsTime ? "datetime-local" : "date"}
                value={needsTime ? toDateTimeLocal(endAt) : toDate(endAt)}
                onChange={(e) => setEndAt(e.target.value)}
                min={needsTime ? (startAt || todayDateTime) : (startAt || today)}
                className="rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
        >
          {t('searchButton')}
        </button>
      </div>
    </form>
  );
}
