'use client';

import { useTranslations } from 'next-intl';

export function RarityMessage() {
  const t = useTranslations('checkout');

  return (
    <div className="mt-3 rounded-lg bg-[var(--color-rarity-bg)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">💎</span>
        <p className="text-sm font-medium text-[var(--color-black)]">
          {t('rarityMessage') || 'Perle rare ! Les réservations pour ce logement sont fréquentes.'}
        </p>
      </div>
    </div>
  );
}
