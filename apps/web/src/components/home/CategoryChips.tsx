'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

const CATEGORY_KEYS = [
  'new',
  'city',
  'economy',
  'electric',
  'convertible',
  'sport',
  'luxury',
  'suv',
  'family',
  'van',
  'collection',
] as const;

export function CategoryChips() {
  const t = useTranslations('categories');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') ?? '';

  const setCategory = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', 'CAR_RENTAL');
    if (key === 'new' || !key) {
      params.delete('category');
    } else {
      params.set('category', key);
    }
    router.push(`/${locale}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {CATEGORY_KEYS.map((key) => {
        const label = t(key);
        const isActive = (key === 'new' && !currentCategory) || currentCategory === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key === 'new' ? '' : key)}
            className={`
              flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors
              ${isActive ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'}
            `}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-3 4h3m-6 0H8m0 0v-2m0 2v2m0-2h2" />
            </svg>
            {label}
          </button>
        );
      })}
    </div>
  );
}
