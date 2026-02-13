'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from './AddressAutocomplete';
import { DesktopDatePicker } from './search/DesktopDatePicker';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

export type ListingType = 'location' | 'experience' | 'ride';

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
  /** Override listing type (e.g. from tabs in mobile search sheet). */
  listingType?: ListingType;
};

function formatDateRange(startDate: string, endDate: string, locale: string, t: any): string {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate days (inclusive)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because both dates are inclusive
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  
  let dateRange: string;
  if (startMonth === endMonth) {
    // Same month: "11–20 février"
    const monthName = start.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
    dateRange = `${startDay}–${endDay} ${monthName}`;
  } else {
    // Different months: "28 février – 5 mars"
    const startMonthName = start.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
    const endMonthName = end.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
    dateRange = `${startDay} ${startMonthName} – ${endDay} ${endMonthName}`;
  }
  
  const daysKey = diffDays === 1 ? 'days' : 'days_plural';
  const daysText = t(daysKey, { count: diffDays });
  
  // Format: "11–20 février · 9 jours" or "28 février – 5 mars · 6 jours"
  return `${dateRange} · ${daysText}`;
}

export function HeaderSearchBar({ onAfterSubmit, variant = 'inline', listingType: listingTypeProp }: HeaderSearchBarProps) {
  const t = useTranslations('headerSearch');
  const tDatePicker = useTranslations('datePicker');
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const countryCodes = useActiveMarketCountryCodes();
  const listingType = listingTypeProp ?? getListingTypeFromPath(pathname);
  const isLocation = listingType === 'location';
  const needsTime = listingType === 'location' || listingType === 'ride';

  const [destination, setDestination] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guests, setGuests] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  
  // Convert date + time to datetime-local format
  const toDateTimeLocal = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.slice(0, 16); // Already datetime format
    if (dateStr.length === 10) {
      const time = timeStr || '09:00';
      return `${dateStr}T${time}`;
    }
    return dateStr;
  };
  
  // Extract date from datetime-local
  const extractDate = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    return dateTimeStr.slice(0, 10);
  };
  
  // Extract time from datetime-local
  const extractTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    if (dateTimeStr.includes('T')) {
      return dateTimeStr.slice(11, 16);
    }
    return '';
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (listingType === 'location') {
      params.set('type', 'CAR_RENTAL');
      if (selectedAddress) {
        // Use coordinates for precise geographic search
        params.set('lat', selectedAddress.latitude.toString());
        params.set('lng', selectedAddress.longitude.toString());
        if (selectedAddress.city) params.set('city', selectedAddress.city);
        if (selectedAddress.country) params.set('country', selectedAddress.country);
      } else if (destination.trim()) {
        // Fallback to text search
        params.set('city', destination.trim());
      }
      if (startDate) {
        if (needsTime && startTime) {
          const startDateTime = toDateTimeLocal(startDate, startTime);
          const startDateObj = new Date(startDateTime);
          if (!isNaN(startDateObj.getTime())) {
            params.set('startAt', startDateObj.toISOString());
          }
        } else {
          params.set('startDate', startDate);
        }
      }
      if (endDate) {
        if (needsTime && endTime) {
          const endDateTime = toDateTimeLocal(endDate, endTime);
          const endDateObj = new Date(endDateTime);
          if (!isNaN(endDateObj.getTime())) {
            params.set('endAt', endDateObj.toISOString());
          }
        } else {
          params.set('endDate', endDate);
        }
      }
      // No guests/seats for location
      router.push(`/${locale}/location?${params.toString()}`);
    } else if (listingType === 'experience') {
      params.set('type', 'MOTORIZED_EXPERIENCE');
      if (selectedAddress) {
        // Use coordinates for precise geographic search
        params.set('lat', selectedAddress.latitude.toString());
        params.set('lng', selectedAddress.longitude.toString());
        if (selectedAddress.city) params.set('city', selectedAddress.city);
        if (selectedAddress.country) params.set('country', selectedAddress.country);
      } else if (destination.trim()) {
        // Fallback to text search
        params.set('city', destination.trim());
      }
      if (startDate) params.set('date', startDate);
      router.push(`/${locale}/experience?${params.toString()}`);
    } else {
      params.set('type', 'CHAUFFEUR');
      if (selectedAddress) {
        // Use coordinates for precise geographic search
        params.set('lat', selectedAddress.latitude.toString());
        params.set('lng', selectedAddress.longitude.toString());
        if (selectedAddress.city) params.set('city', selectedAddress.city);
        if (selectedAddress.country) params.set('country', selectedAddress.country);
      } else if (destination.trim()) {
        // Fallback to text search
        params.set('city', destination.trim());
      }
      if (startDate) {
        if (needsTime && startTime) {
          const startDateTime = toDateTimeLocal(startDate, startTime);
          const startDateObj = new Date(startDateTime);
          if (!isNaN(startDateObj.getTime())) {
            params.set('startAt', startDateObj.toISOString());
          }
        } else {
          params.set('date', startDate);
        }
      }
      router.push(`/${locale}/ride?${params.toString()}`);
    }
    onAfterSubmit?.();
  };

  const isStacked = variant === 'stacked';
  const segmentClass = isStacked
    ? 'flex flex-col gap-1.5'
    : 'flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-3 hover:bg-[var(--color-gray-bg)] transition-colors rounded-l first:rounded-l-none last:rounded-r-none cursor-pointer relative';
  const labelClass = 'text-xs font-semibold text-[var(--color-black)] whitespace-nowrap';
  const inputClassInline =
    'w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[var(--color-gray-dark)] placeholder:text-[var(--color-gray)] focus:outline-none focus:ring-0';
  const inputClassStacked =
    'w-full min-w-0 rounded-ds-input border border-[var(--color-gray-light)] bg-[var(--color-white)] px-3 py-2.5 text-sm text-[var(--color-gray-dark)] placeholder:text-[var(--color-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent';
  const inputClass = isStacked ? inputClassStacked : inputClassInline;

  const formClass = isStacked
    ? 'flex w-full flex-col gap-4'
    : 'flex w-full max-w-3xl flex-nowrap items-stretch overflow-visible rounded-ds-pill border border-[var(--color-gray-light)] bg-[var(--color-white)] shadow-ds-search transition-shadow hover:shadow-ds-search-hover';

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
        <AddressAutocomplete
          value={destination}
          onChange={setDestination}
          onSelect={handleSelect}
          placeholder={t('destinationPlaceholder')}
          className={isStacked ? "mt-0" : ""}
          inputClassName={isStacked ? undefined : inputClassInline}
          allowedCountryCodes={countryCodes.length > 0 ? countryCodes : undefined}
        />
      </div>

      {!isStacked && <div className="flex shrink-0 self-stretch w-px bg-neutral-200" aria-hidden />}

      {/* Dates */}
      <div 
        ref={dateFieldRef}
        className={`relative ${isStacked ? segmentClass : `${segmentClass} min-w-[120px] ${isLocation ? 'flex-[1.1]' : 'flex-1'}`}`}
      >
        <label htmlFor="header-search-dates" className={labelClass}>
          {t('dates')}
        </label>
        {isStacked ? (
          // Mobile: use datetime-local for location and ride
          <div className="flex flex-col gap-2">
            <input
              id="header-search-dates-start"
              type={needsTime ? "datetime-local" : "date"}
              value={needsTime ? toDateTimeLocal(startDate, startTime) : startDate}
              onChange={(e) => {
                if (needsTime) {
                  setStartDate(extractDate(e.target.value));
                  setStartTime(extractTime(e.target.value));
                } else {
                  setStartDate(e.target.value);
                }
              }}
              className={inputClass}
              aria-label={t('datesPlaceholder')}
              min={needsTime ? new Date().toISOString().slice(0, 16) : new Date().toISOString().slice(0, 10)}
            />
            {(isLocation || needsTime) && (
              <>
                <label htmlFor="header-search-dates-end" className={labelClass}>{t('datesEnd')}</label>
                <input
                  id="header-search-dates-end"
                  type={needsTime ? "datetime-local" : "date"}
                  value={needsTime ? toDateTimeLocal(endDate, endTime) : endDate}
                  onChange={(e) => {
                    if (needsTime) {
                      setEndDate(extractDate(e.target.value));
                      setEndTime(extractTime(e.target.value));
                    } else {
                      setEndDate(e.target.value);
                    }
                  }}
                  className={inputClass}
                  aria-label={t('datesPlaceholder')}
                  min={needsTime ? (startDate && startTime ? toDateTimeLocal(startDate, startTime) : new Date().toISOString().slice(0, 16)) : (startDate || new Date().toISOString().slice(0, 10))}
                />
              </>
            )}
          </div>
        ) : (
          // Desktop: clickable field that opens DesktopDatePicker
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className={`w-full text-left ${inputClassInline} ${!startDate && !endDate ? 'text-[var(--color-gray)]' : ''}`}
          >
            {isLocation && startDate && endDate
              ? formatDateRange(startDate, endDate, locale, tDatePicker)
              : startDate
              ? new Date(startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
              : t('datesPlaceholder')}
          </button>
        )}
        {!isStacked && (
          <>
            <DesktopDatePicker
              open={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              startDate={startDate || null}
              endDate={isLocation ? (endDate || null) : null}
              onSelect={(start, end) => {
                setStartDate(start || '');
                setEndDate(end || '');
                // Set default time if not set
                if (needsTime && start && !startTime) {
                  setStartTime('09:00');
                }
                if (needsTime && end && !endTime) {
                  setEndTime('09:00');
                }
              }}
              minDate={new Date()}
              anchorRef={dateFieldRef}
            />
            {/* Time inputs for desktop - show when dates are selected and needsTime is true */}
            {needsTime && startDate && !datePickerOpen && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 flex gap-3 min-w-[280px]">
                {isLocation && endDate ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="header-search-start-time" className="text-xs font-medium text-neutral-700">
                        {t('startTime') || 'Heure début'}
                      </label>
                      <input
                        id="header-search-start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="header-search-end-time" className="text-xs font-medium text-neutral-700">
                        {t('endTime') || 'Heure fin'}
                      </label>
                      <input
                        id="header-search-end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                ) : listingType === 'ride' ? (
                  <div className="flex flex-col gap-1 w-full">
                    <label htmlFor="header-search-start-time" className="text-xs font-medium text-neutral-700">
                      {t('startTime') || 'Heure'}
                    </label>
                    <input
                      id="header-search-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {!isStacked && !isLocation && <div className="flex shrink-0 self-stretch w-px bg-neutral-200" aria-hidden />}

      {/* Voyageurs / Guests - only for experience/ride */}
      {!isLocation && (
        <>
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
          {!isStacked && <div className="flex shrink-0 self-stretch w-px bg-neutral-200" aria-hidden />}
        </>
      )}

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
