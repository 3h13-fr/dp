import { useTranslations } from 'next-intl';
import { ListingsGrid } from '@/components/listings/ListingsGrid';
import { SearchBarLocation } from '@/components/listings/SearchBarLocation';

export default function LocationListingsPage() {
  const t = useTranslations('listings');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold" data-testid="listings-location-title">{t('location')}</h1>
      <div className="mt-6 mb-8">
        <SearchBarLocation />
      </div>
      <ListingsGrid listingType="CAR_RENTAL" />
    </div>
  );
}
