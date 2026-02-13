'use client';

import { MapDrivenSearch } from '@/components/listings/MapDrivenSearch';

export default function LocationPage() {
  return (
    <div className="w-full">
      <MapDrivenSearch listingType="CAR_RENTAL" />
    </div>
  );
}
