'use client';

import { useTranslations } from 'next-intl';

const EQUIPMENT_KEYS = ['gps', 'rearRadar', 'sunroof', 'bluetooth', 'airConditioning', 'appleCarPlay'] as const;
export type EquipmentKey = (typeof EQUIPMENT_KEYS)[number];

type Step4VehicleOptionsProps = {
  selected: EquipmentKey[];
  onChange: (selected: EquipmentKey[]) => void;
  onNext: () => void;
  onBack: () => void;
};

export function Step4VehicleOptions({ selected, onChange, onNext, onBack }: Step4VehicleOptionsProps) {
  const t = useTranslations('createListing');

  const toggle = (key: EquipmentKey) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step4Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step4Desc')}</p>
      <div className="flex flex-wrap gap-3">
        {EQUIPMENT_KEYS.map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded border-border"
            />
            <span>{t(`equipment.${key}`)}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-lg border border-border px-6 py-2.5 font-medium">
          {t('back')}
        </button>
        <button type="button" onClick={onNext} className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground">
          {t('next')}
        </button>
      </div>
    </div>
  );
}
