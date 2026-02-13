'use client';

import { useTranslations } from 'next-intl';

type FuelPolicyEditorProps = {
  value: 'full_to_full' | 'full_to_empty' | 'same_level';
  onChange: (value: 'full_to_full' | 'full_to_empty' | 'same_level') => void;
};

export function FuelPolicyEditor({ value, onChange }: FuelPolicyEditorProps) {
  const t = useTranslations('createListing');

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'full_to_full' | 'full_to_empty' | 'same_level')}
      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
    >
      <option value="full_to_full">{t('fuelFullToFull') || 'Plein/plein'}</option>
      <option value="full_to_empty">{t('fuelFullToEmpty') || 'Plein/vide'}</option>
      <option value="same_level">{t('fuelSameLevel') || 'Même niveau'}</option>
    </select>
  );
}
