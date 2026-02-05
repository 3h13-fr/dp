'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

type ListingType = 'location' | 'experience' | 'ride';

function getListingTypeFromPath(path: string): ListingType {
  if (path.includes('/experience')) return 'experience';
  if (path.includes('/ride')) return 'ride';
  return 'location';
}

type HeaderSearchBarProps = {
  /** Called after submit (e.g. to close a bottom sheet on mobile). */
  onAfterSubmit?: () => void;
  /** Use stacked layout (for bottom sheet on mobile). */
  variant?: 'inline' | 'stacked';
};

export function HeaderSearchBar({ onAfterSubmit, variant = 'inline' }: HeaderSearchBarProps) {
  const t = useTranslations('headerSearch');
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const listingType = getListingTypeFromPath(pathname);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (listingType === 'location') {
      params.set('type', 'CAR_RENTAL');
      if (destination.trim()) params.set('city', destination.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (guests.trim()) params.set('seats', guests.trim());
      router.push(`/${locale}/location?${params.toString()}`);
    } else if (listingType === 'experience') {
      params.set('type', 'MOTORIZED_EXPERIENCE');
      if (destination.trim()) params.set('city', destination.trim());
      if (startDate) params.set('date', startDate);
      router.push(`/${locale}/experience?${params.toString()}`);
    } else {
      params.set('type', 'CHAUFFEUR');
      if (destination.trim()) params.set('city', destination.trim());
      if (startDate) params.set('date', startDate);
      router.push(`/${locale}/ride?${params.toString()}`);
    }
    onAfterSubmit?.();
  };

  const isStacked = variant === 'stacked';
  const segmentClass = isStacked
    ? 'flex flex-col gap-1.5'
    : 'flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-3 hover:bg-[var(--color-gray-bg)] transition-colors rounded-l first:rounded-l-none last:rounded-r-none cursor-pointer';
  const labelClass = 'text-xs font-semibold text-[var(--color-black)] whitespace-nowrap';
  const inputClassInline =
    'w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[var(--color-gray-dark)] placeholder:text-[var(--color-gray)] focus:outline-none focus:ring-0';
  const inputClassStacked =
    'w-full min-w-0 rounded-ds-input border border-[var(--color-gray-light)] bg-[var(--color-white)] px-3 py-2.5 text-sm text-[var(--color-gray-dark)] placeholder:text-[var(--color-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent';
  const inputClass = isStacked ? inputClassStacked : inputClassInline;

  const formClass = isStacked
    ? 'flex w-full flex-col gap-4'
    : 'flex w-full max-w-3xl flex-nowrap items-stretch overflow-hidden rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] shadow-ds-search transition-shadow hover:shadow-ds-search-hover';

  return (
    <form
      onSubmit={handleSubmit}
      className={formClass}
      role="search"
    >
      {/* Destination */}
      <div className={isStacked ? segmentClass : `${segmentClass} min-w-[140px] flex-[1.2]`}>
        <label htmlFor="header-search-destination" className={labelClass}>
          {t('destination')}
        </label>
        <input
          id="header-search-destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={t('destinationPlaceholder')}
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {!isStacked && <div className="flex shrink-0 self-stretch w-px bg-neutral-200" aria-hidden />}

      {/* Dates */}
      <div className={isStacked ? segmentClass : `${segmentClass} min-w-[120px] ${listingType === 'location' ? 'flex-[1.1]' : 'flex-1'}`}>
        <label htmlFor="header-search-dates-start" className={labelClass}>
          {t('dates')}
        </label>
        <div className={isStacked ? 'flex flex-col gap-2' : 'flex items-center gap-1 min-w-0'}>
          <input
            id="header-search-dates-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={isStacked ? inputClass : `${inputClass} max-w-[110px]`}
            aria-label={t('datesPlaceholder')}
          />
          {listingType === 'location' && (
            <>
              {isStacked ? (
                <label htmlFor="header-search-dates-end" className={labelClass}>{t('datesEnd')}</label>
              ) : (
                <span className="text-neutral-400 shrink-0">→</span>
              )}
              <input
                id="header-search-dates-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={isStacked ? inputClass : `${inputClass} max-w-[110px]`}
                aria-label={t('datesPlaceholder')}
              />
            </>
          )}
        </div>
      </div>

      {!isStacked && <div className="flex shrink-0 self-stretch w-px bg-neutral-200" aria-hidden />}

      {/* Voyageurs / Guests */}
      <div className={isStacked ? segmentClass : `${segmentClass} min-w-[100px] flex-1`}>
        <label htmlFor="header-search-guests" className={labelClass}>
          {t('guests')}
        </label>
        <input
          id="header-search-guests"
          type="text"
          inputMode="numeric"
          value={guests}
          onChange={(e) => setGuests(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder={t('guestsPlaceholder')}
          className={inputClass}
        />
      </div>

      {/* Search button */}
      <div className={isStacked ? 'pt-2' : 'flex shrink-0 items-center p-1.5'}>
        <button
          type="submit"
          className={isStacked
            ? 'flex w-full items-center justify-center gap-2 rounded-ds-button bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-ds-primary-hover transition-colors'
            : 'flex h-9 w-9 items-center justify-center rounded-ds-pill bg-primary text-primary-foreground hover:bg-ds-primary-hover transition-colors'}
          aria-label={t('searchButton')}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isStacked && <span>{t('searchButton')}</span>}
        </button>
      </div>
    </form>
  );
}
