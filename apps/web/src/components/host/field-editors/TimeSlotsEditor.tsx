'use client';

import { useTranslations } from 'next-intl';

type TimeSlot = { start: string; end: string };

type TimeSlotsEditorProps = {
  value: TimeSlot[];
  onChange: (value: TimeSlot[]) => void;
};

export function TimeSlotsEditor({ value, onChange }: TimeSlotsEditorProps) {
  const t = useTranslations('createListing');

  const addSlot = () => {
    onChange([...value, { start: '00:00', end: '23:59' }]);
  };

  const removeSlot = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'start' | 'end', newValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((slot, index) => (
        <div key={index} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3">
          <input
            type="time"
            value={slot.start}
            onChange={(e) => updateSlot(index, 'start', e.target.value)}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          <span className="text-sm text-neutral-600">-</span>
          <input
            type="time"
            value={slot.end}
            onChange={(e) => updateSlot(index, 'end', e.target.value)}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          {value.length > 1 && (
            <button
              type="button"
              onClick={() => removeSlot(index)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              {t('remove') || 'Supprimer'}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addSlot}
        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {t('addTimeSlot') || 'Ajouter une plage horaire'}
      </button>
    </div>
  );
}
