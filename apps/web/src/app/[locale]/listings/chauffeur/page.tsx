import { useTranslations } from 'next-intl';
import { ListingsGrid } from '@/components/listings/ListingsGrid';
import { SearchBarChauffeur } from '@/components/listings/SearchBarChauffeur';

export default function ChauffeurListingsPage() {
  const t = useTranslations('listings');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('chauffeur')}</h1>
      <div className="mt-6 mb-8">
        <SearchBarChauffeur />
      </div>
      <ListingsGrid listingType="CHAUFFEUR" />
    </div>
  );
}
