'use client';

import { ListingsGrid } from '@/components/listings/ListingsGrid';

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ListingsGrid listingType="MOTORIZED_EXPERIENCE" />
    </div>
  );
}
