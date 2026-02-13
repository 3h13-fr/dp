'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SearchFieldCard } from './SearchFieldCard';
import { SearchCTA } from './SearchCTA';
import type { AddressSuggestion } from '@/components/AddressAutocomplete';
import type { ListingType } from '@/components/HeaderSearchBar';

type MobileSearchSummaryProps = {
  destination: AddressSuggestion | null;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  listingType: ListingType;
  onDestinationClick: () => void;
  onDatesClick: () => void;
  onGuestsClick: () => void;
  onSearch: () => void;
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

export function MobileSearchSummary({
  destination,
  startDate,
  endDate,
  adults,
  children,
  listingType,
  onDestinationClick,
  onDatesClick,
  onGuestsClick,
  onSearch,
}: MobileSearchSummaryProps) {
  const t = useTranslations('mobileSearch');
  const tDatePicker = useTranslations('datePicker');
  const tHeader = useTranslations('headerSearch');
  const locale = useLocale();

  const isLocation = listingType === 'location';

  // Format dates summary
  const datesSummary = useMemo(() => {
    if (!startDate) return null;
    if (isLocation && !endDate) return null;

    if (isLocation) {
      return formatDateRange(startDate, endDate, locale, tDatePicker);
    } else {
      // For experience/ride, just show the date
      const date = new Date(startDate);
      return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
    }
  }, [startDate, endDate, isLocation, locale, tDatePicker]);

  // Format guests summary
  const guestsSummary = useMemo(() => {
    const total = adults + children;
    if (total === 0) return null;
    if (children > 0) {
      return `${adults} ${t('adults')}, ${children} ${t('children')}`;
    }
    return `${total} ${t('guests')}`;
  }, [adults, children, t]);

  const isSearchDisabled = !destination || !startDate || (isLocation && !endDate);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 px-4 pt-4">
        <SearchFieldCard
          label={tHeader('destination')}
          value={destination?.address || null}
          placeholder={t('selectDestination')}
          onClick={onDestinationClick}
          isEmpty={!destination}
        />
        <SearchFieldCard
          label={tHeader('dates')}
          value={datesSummary}
          placeholder={t('selectDates')}
          onClick={onDatesClick}
          isEmpty={!startDate || (isLocation && !endDate)}
        />
        {!isLocation && (
          <SearchFieldCard
            label={tHeader('guests')}
            value={guestsSummary}
            placeholder={t('selectGuests')}
            onClick={onGuestsClick}
            isEmpty={adults === 0 && children === 0}
          />
        )}
      </div>
      <SearchCTA disabled={isSearchDisabled} onClick={onSearch} />
    </div>
  );
}
