'use client';

import { useTranslations } from 'next-intl';
import { ListingsGrid } from '@/components/listings/ListingsGrid';

export default function ExperiencePage() {
  const t = useTranslations('listings');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold" data-testid="listings-experience-title">{t('experience')}</h1>
      <ListingsGrid listingType="MOTORIZED_EXPERIENCE" />
    </div>
  );
}
