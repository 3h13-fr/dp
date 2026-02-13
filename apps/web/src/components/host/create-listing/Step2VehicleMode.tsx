'use client';

import { useTranslations } from 'next-intl';

export type VehicleMode = 'location' | 'chauffeur' | 'both';

type Step2VehicleModeProps = {
  value: VehicleMode | null;
  onChange: (value: VehicleMode) => void;
  onNext: () => void;
  onBack: () => void;
};

export function Step2VehicleMode({ value, onChange, onNext, onBack }: Step2VehicleModeProps) {
  const t = useTranslations('createListing');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step2Title')}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onChange('location')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-colors ${
            value === 'location' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <span className="text-2xl" aria-hidden>🔑</span>
          <span className="font-medium">{t('modeLocation')}</span>
          <span className="text-sm text-muted-foreground">{t('modeLocationDesc')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('chauffeur')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-colors ${
            value === 'chauffeur' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <span className="text-2xl" aria-hidden>🚙</span>
          <span className="font-medium">{t('modeChauffeur')}</span>
          <span className="text-sm text-muted-foreground">{t('modeChauffeurDesc')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('both')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-colors ${
            value === 'both' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <span className="text-2xl" aria-hidden>🔑🚙</span>
          <span className="font-medium">{t('modeBoth')}</span>
          <span className="text-sm text-muted-foreground">{t('modeBothDesc')}</span>
        </button>
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-lg border border-border px-6 py-2.5 font-medium">
          {t('back')}
        </button>
        <div className="flex flex-col items-end gap-2">
          {!value && (
            <p className="text-xs text-red-600">{t('vehicleModeRequired') || 'Veuillez sélectionner un mode de véhicule'}</p>
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
