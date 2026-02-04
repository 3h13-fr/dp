import { getTranslations } from 'next-intl/server';

export default async function NotificationsPage() {
  const t = await getTranslations('nav');
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">{t('notifications')}</h1>
      <p className="mt-4 text-neutral-600">Vos notifications apparaîtront ici.</p>
    </div>
  );
}
