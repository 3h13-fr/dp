'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { S3Image } from '@/components/S3Image';

const CATEGORY_IMAGE_URL = 'https://drivepark.net/storage/2024/09/08/new-1725747944.png';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

function hasActiveSearch(searchParams: URLSearchParams): boolean {
  return !!(
    searchParams.get('city') ||
    searchParams.get('q') ||
    (searchParams.get('lat') && searchParams.get('lng')) ||
    searchParams.get('country') ||
    searchParams.get('startAt') ||
    searchParams.get('endAt')
  );
}

function getVerticalFromPath(pathname: string): 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR' {
  if (pathname.includes('/experience')) return 'MOTORIZED_EXPERIENCE';
  if (pathname.includes('/ride')) return 'CHAUFFEUR';
  return 'CAR_RENTAL';
}

export function HeaderCategories() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const isLocationPage = pathname.includes('/location');
  const hasSearch = isLocationPage && hasActiveSearch(searchParams);
  const currentCategory = searchParams.get('category') ?? '';
  const vertical = getVerticalFromPath(pathname);

  // Load categories from API
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/categories?vertical=${vertical}`)
      .then((res) => res.json())
      .then((data: Category[]) => {
        setCategories(data || []);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, [vertical]);

  const setCategory = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', vertical);
    if (!slug || slug === 'new' || slug === 'yourSearch') {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
    router.push(`/${locale}${pathWithoutLocale}?${params.toString()}`, { scroll: false });
  };

  // Déterminer quelle catégorie afficher en premier (new ou yourSearch)
  const firstCategoryLabel = hasSearch ? t('yourSearch') : t('new');

  // Déterminer si la première catégorie est active (quand aucune catégorie n'est sélectionnée)
  const isFirstCategoryActive = !currentCategory;

  if (loading) {
    return null; // Don't show anything while loading
  }

  return (
    <div className="border-t border-neutral-100 bg-white relative">
      <div className="mx-auto max-w-6xl px-4 pt-3 pb-0">
        <div className="flex gap-6 overflow-x-auto items-end">
          {/* Première catégorie : "New" ou "Votre recherche" */}
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="flex shrink-0 flex-col items-center transition-colors relative pb-0"
          >
            <div className="relative h-12 w-16 mb-2">
              <Image
                src={CATEGORY_IMAGE_URL}
                alt={firstCategoryLabel}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                isFirstCategoryActive ? 'text-black' : 'text-neutral-600'
              }`}
            >
              {firstCategoryLabel}
            </span>
            {isFirstCategoryActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>

          {/* Catégories depuis l'API */}
          {categories.map((category) => {
            const isActive = currentCategory === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategory(category.slug)}
                className="flex shrink-0 flex-col items-center transition-colors relative pb-0"
              >
                <div className="relative h-12 w-16 mb-2">
                  {category.imageUrl ? (
                    <S3Image
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-black' : 'text-neutral-600'
                  }`}
                >
                  {category.name}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
