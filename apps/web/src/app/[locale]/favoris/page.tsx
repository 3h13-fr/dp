import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function FavorisPage() {
  const t = await getTranslations('nav');
  const tListings = await getTranslations('listings');
  const locale = await getLocale();
  const prefix = `/${locale}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold text-black">{t('favorites')}</h1>
      <p className="mt-4 text-neutral-600">
        {tListings('noResults')}
      </p>
      <Link
        href={prefix}
        className="mt-6 inline-block rounded-lg bg-neutral-800 px-6 py-3 font-medium text-white hover:bg-neutral-900"
      >
        {t('vehicles')}
      </Link>
    </div>
  );
}
