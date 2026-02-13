'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type TravelInsuranceCardProps = {
  insurancePrice: number;
  currency: string;
  onAdd: () => void;
  added?: boolean;
};

export function TravelInsuranceCard({
  insurancePrice,
  currency,
  onAdd,
  added = false,
}: TravelInsuranceCardProps) {
  const t = useTranslations('checkout');
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  if (added) {
    return null; // Ne pas afficher si déjà ajoutée
  }

  return (
    <div className="rounded-[var(--radius-card-medium)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-black)]">
        {t('addTravelInsurance') || 'Ajouter une assurance voyage ?'}
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-[var(--color-black)]">
              {t('addInsuranceFor', { amount: formatPrice(insurancePrice) }) || `Oui, ajouter pour ${formatPrice(insurancePrice)}`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-gray)]">
              {t('insuranceOnlyAtBooking') || 'Disponible uniquement lors de la réservation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-[var(--radius-button)] border border-[var(--color-gray-light)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-black)] transition-colors hover:bg-[var(--color-gray-bg)]"
          >
            {t('add') || 'Ajouter'}
          </button>
        </div>

        <div className="rounded-lg bg-[var(--color-gray-bg)] p-4">
          <p className="text-sm text-[var(--color-gray-dark)]">
            {t('insuranceCoverage') || 'Obtenez un remboursement couvrant jusqu\'à 100% du coût de votre séjour si vous annulez pour des raisons couvertes. Vous bénéficiez également d\'une couverture pour les vols et les activités.'}
          </p>
          <button
            type="button"
            className="mt-2 text-sm underline text-[var(--color-gray-dark)] hover:text-[var(--color-black)]"
          >
            {t('whatIsCovered') || 'Ce qui est couvert'}
          </button>
        </div>
      </div>
    </div>
  );
}
