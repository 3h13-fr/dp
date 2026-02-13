'use client';

import { MapDrivenSearch } from '@/components/listings/MapDrivenSearch';

export default function RidePage() {
  return (
    <div className="w-full">
      <MapDrivenSearch listingType="CHAUFFEUR" />
    </div>
  );
}
