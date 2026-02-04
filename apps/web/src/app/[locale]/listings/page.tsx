import { useTranslations } from 'next-intl';
import { ListingsGrid } from '@/components/listings/ListingsGrid';

export default function ListingsPage() {
  const t = useTranslations('nav');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('listings')}</h1>
      <ListingsGrid />
    </div>
  );
}
