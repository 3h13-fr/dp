'use client';

import { useTranslations } from 'next-intl';

export type OfferType = 'vehicle' | 'experience';

type Step1OfferTypeProps = {
  value: OfferType | null;
  onChange: (value: OfferType) => void;
  onNext: () => void;
  onBack?: () => void;
};

export function Step1OfferType({ value, onChange, onNext, onBack }: Step1OfferTypeProps) {
  const t = useTranslations('createListing');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step1Title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('vehicle')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-colors ${
            value === 'vehicle' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <span className="text-3xl" aria-hidden>🚗</span>
          <span className="font-medium">{t('offerVehicle')}</span>
          <span className="text-sm text-muted-foreground">{t('offerVehicleDesc')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('experience')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-colors ${
            value === 'experience' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <span className="text-3xl" aria-hidden>🎯</span>
          <span className="font-medium">{t('offerExperience')}</span>
          <span className="text-sm text-muted-foreground">{t('offerExperienceDesc')}</span>
        </button>
      </div>
      <div className="flex justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} className="rounded-lg border border-border px-6 py-2.5 font-medium">
            {t('back')}
          </button>
        ) : (
          <div></div>
        )}
        <div className="flex flex-col items-end gap-2">
          {!value && (
            <p className="text-xs text-red-600">{t('offerTypeRequired') || 'Veuillez sélectionner un type d\'offre'}</p>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!value}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('next')}
          </button>
        </div>
      </div>
    </div>
  );
}
