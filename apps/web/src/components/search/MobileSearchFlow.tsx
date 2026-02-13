'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { MobileSearchSummary } from './MobileSearchSummary';
import { DestinationScreen } from './DestinationScreen';
import { DateRangeScreen } from './DateRangeScreen';
import { GuestsScreen } from './GuestsScreen';
import type { AddressSuggestion } from '@/components/AddressAutocomplete';
import type { ListingType } from '@/components/HeaderSearchBar';
import { useActiveMarketCountryCodes } from '@/hooks/useActiveMarketCountryCodes';

type Screen = 'summary' | 'destination' | 'dates' | 'guests';

type MobileSearchFlowProps = {
  listingType: ListingType;
  onAfterSubmit?: () => void;
};

export function MobileSearchFlow({ listingType, onAfterSubmit }: MobileSearchFlowProps) {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const countryCodes = useActiveMarketCountryCodes();

  const [currentScreen, setCurrentScreen] = useState<Screen>('summary');
  const [destination, setDestination] = useState<AddressSuggestion | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const isLocation = listingType === 'location';
  const needsTime = listingType === 'location' || listingType === 'ride';

  const handleSubmit = () => {
    const params = new URLSearchParams();
    
    if (listingType === 'location') {
      params.set('type', 'CAR_RENTAL');
      if (destination) {
        params.set('lat', destination.latitude.toString());
        params.set('lng', destination.longitude.toString());
        if (destination.city) params.set('city', destination.city);
        if (destination.country) params.set('country', destination.country);
      }
      if (startDate) {
        if (needsTime && startDate.includes('T')) {
          // Convert datetime-local to ISO format
          const startDateObj = new Date(startDate);
          if (!isNaN(startDateObj.getTime())) {
            params.set('startAt', startDateObj.toISOString());
          }
        } else {
          params.set('startDate', startDate);
        }
      }
      if (endDate) {
        if (needsTime && endDate.includes('T')) {
          // Convert datetime-local to ISO format
          const endDateObj = new Date(endDate);
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
      if (destination) {
        params.set('lat', destination.latitude.toString());
        params.set('lng', destination.longitude.toString());
        if (destination.city) params.set('city', destination.city);
        if (destination.country) params.set('country', destination.country);
      }
      if (startDate) {
        // For experience, extract date only if it's a datetime
        const dateOnly = startDate.includes('T') ? startDate.slice(0, 10) : startDate;
        params.set('date', dateOnly);
      }
      router.push(`/${locale}/experience?${params.toString()}`);
    } else {
      params.set('type', 'CHAUFFEUR');
      if (destination) {
        params.set('lat', destination.latitude.toString());
        params.set('lng', destination.longitude.toString());
        if (destination.city) params.set('city', destination.city);
        if (destination.country) params.set('country', destination.country);
      }
      if (startDate) {
        if (needsTime && startDate.includes('T')) {
          // Convert datetime-local to ISO format
          const startDateObj = new Date(startDate);
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

  return (
    <>
      {currentScreen === 'summary' && (
        <MobileSearchSummary
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          adults={adults}
          children={children}
          listingType={listingType}
          onDestinationClick={() => setCurrentScreen('destination')}
          onDatesClick={() => setCurrentScreen('dates')}
          onGuestsClick={isLocation ? () => {} : () => setCurrentScreen('guests')}
          onSearch={handleSubmit}
        />
      )}

      <DestinationScreen
        open={currentScreen === 'destination'}
        onClose={() => setCurrentScreen('summary')}
        value={destination}
        onSelect={(suggestion) => {
          setDestination(suggestion);
          setCurrentScreen('summary');
        }}
        allowedCountryCodes={countryCodes.length > 0 ? countryCodes : undefined}
      />

      <DateRangeScreen
        open={currentScreen === 'dates'}
        onClose={() => setCurrentScreen('summary')}
        listingType={listingType}
        startDate={startDate}
        endDate={endDate}
        onSelect={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setCurrentScreen('summary');
        }}
      />

      {!isLocation && (
        <GuestsScreen
          open={currentScreen === 'guests'}
          onClose={() => setCurrentScreen('summary')}
          adults={adults}
          children={children}
          onSelect={(adults, children) => {
            setAdults(adults);
            setChildren(children);
            setCurrentScreen('summary');
          }}
        />
      )}
    </>
  );
}
