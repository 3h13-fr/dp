'use client';

import { useTranslations } from 'next-intl';

export default function MessagesPage() {
  const t = useTranslations('nav');
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('messages')}</h1>
      <p className="mt-4 text-muted-foreground">
        Chat with hosts and operators will be available here. (Coming soon.)
      </p>
    </div>
  );
}
