import { useTranslations } from 'next-intl';
import { ListingsGrid } from '@/components/listings/ListingsGrid';
import { SearchBarExperience } from '@/components/listings/SearchBarExperience';

export default function ExperienceListingsPage() {
  const t = useTranslations('listings');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('experience')}</h1>
      <div className="mt-6 mb-8">
        <SearchBarExperience />
      </div>
      <ListingsGrid listingType="MOTORIZED_EXPERIENCE" />
    </div>
  );
}
