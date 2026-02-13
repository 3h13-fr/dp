'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const CATEGORY_KEYS = [
  'city',
  'economy',
  'electric',
  'convertible',
  'sport',
  'luxury',
  'suv',
  'family',
  'van',
] as const;

type ListingsFiltersProps = {
  listingType: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
};

export function ListingsFilters({ listingType }: ListingsFiltersProps) {
  const t = useTranslations('categories');
  const tListing = useTranslations('listings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [geoLoading, setGeoLoading] = useState(false);
  const category = searchParams.get('category') ?? '';
  const transmission = searchParams.get('transmission') ?? '';
  const fuelType = searchParams.get('fuelType') ?? '';
  const sortBy = searchParams.get('sortBy') ?? '';
  const hasCoords = !!(searchParams.get('lat') && searchParams.get('lng'));

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('lat', String(pos.coords.latitude));
        params.set('lng', String(pos.coords.longitude));
        params.set('radius', '50000');
        params.delete('sortBy');
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  };

  const isLocation = listingType === 'CAR_RENTAL';

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">{tListing('filters')}</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => {
            const isActive = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setParam('category', isActive ? '' : key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                }`}
              >
                {t(key)}
              </button>
            );
          })}
        </div>
      </div>
      {isLocation && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{tListing('transmission')}</span>
            <select
              value={transmission}
              onChange={(e) => setParam('transmission', e.target.value)}
              className="rounded border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">{tListing('any')}</option>
              <option value="manual">{t('listingCard.transmissionManual')}</option>
              <option value="automatic">{t('listingCard.transmissionAuto')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{tListing('fuel')}</span>
            <select
              value={fuelType}
              onChange={(e) => setParam('fuelType', e.target.value)}
              className="rounded border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">{tListing('any')}</option>
              <option value="petrol">{t('listingCard.fuel')}</option>
              <option value="diesel">{t('listingCard.fuelDiesel')}</option>
              <option value="electric">{t('listingCard.fuelElectric')}</option>
              <option value="hybrid">{t('listingCard.fuelHybrid')}</option>
            </select>
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">{tListing('sortBy')}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNearMe}
            disabled={geoLoading}
            className={`rounded border px-3 py-1.5 text-sm ${hasCoords ? 'border-primary bg-primary/10 font-medium' : 'border-neutral-200'}`}
          >
            {geoLoading ? '…' : tListing('nearMe')}
          </button>
          <button
            type="button"
            onClick={() => setParam('sortBy', sortBy === 'updatedAt' ? '' : 'updatedAt')}
            className={`rounded border px-3 py-1.5 text-sm ${sortBy === 'updatedAt' || !sortBy ? 'border-primary bg-primary/10 font-medium' : 'border-neutral-200'}`}
          >
            {tListing('sortNewest')}
          </button>
          <button
            type="button"
            onClick={() => setParam('sortBy', 'priceAsc')}
            className={`rounded border px-3 py-1.5 text-sm ${sortBy === 'priceAsc' ? 'border-primary bg-primary/10 font-medium' : 'border-neutral-200'}`}
          >
            {tListing('sortPriceAsc')}
          </button>
          <button
            type="button"
            onClick={() => setParam('sortBy', 'priceDesc')}
            className={`rounded border px-3 py-1.5 text-sm ${sortBy === 'priceDesc' ? 'border-primary bg-primary/10 font-medium' : 'border-neutral-200'}`}
          >
            {tListing('sortPriceDesc')}
          </button>
        </div>
      </div>
    </div>
  );
}
