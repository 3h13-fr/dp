'use client';

import { useTranslations } from 'next-intl';
import { CategoryChips } from '@/components/home/CategoryChips';
import { HomeListingsGrid } from '@/components/home/HomeListingsGrid';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6">
          <h2 className="sr-only">{t('searchPlaceholder')}</h2>
          <CategoryChips />
        </section>
        <section>
          <HomeListingsGrid />
        </section>
      </div>
    </div>
  );
}
