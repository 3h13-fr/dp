'use client';

import { useTranslations } from 'next-intl';

type ForbiddenDaysEditorProps = {
  value: number[]; // Array of day indices (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  onChange: (value: number[]) => void;
};

export function ForbiddenDaysEditor({ value, onChange }: ForbiddenDaysEditorProps) {
  const t = useTranslations('createListing');

  const days = [
    { value: 0, label: t('sunday') || 'Dimanche' },
    { value: 1, label: t('monday') || 'Lundi' },
    { value: 2, label: t('tuesday') || 'Mardi' },
    { value: 3, label: t('wednesday') || 'Mercredi' },
    { value: 4, label: t('thursday') || 'Jeudi' },
    { value: 5, label: t('friday') || 'Vendredi' },
    { value: 6, label: t('saturday') || 'Samedi' },
  ];

  const toggleDay = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <div className="space-y-2">
      {days.map((day) => (
        <label key={day.value} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(day.value)}
            onChange={() => toggleDay(day.value)}
            className="h-4 w-4 rounded border-neutral-200"
          />
          <span className="text-sm text-neutral-700">{day.label}</span>
        </label>
      ))}
    </div>
  );
}
