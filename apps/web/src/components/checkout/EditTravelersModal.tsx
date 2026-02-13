'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type EditTravelersModalProps = {
  travelers: number;
  min?: number;
  max?: number;
  onSave: (travelers: number) => void;
  onClose: () => void;
};

export function EditTravelersModal({
  travelers,
  min = 1,
  max = 10,
  onSave,
  onClose,
}: EditTravelersModalProps) {
  const t = useTranslations('checkout');
  const [localTravelers, setLocalTravelers] = useState(travelers);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (localTravelers < min || localTravelers > max) {
      setError(t('travelersRange') || `Le nombre de voyageurs doit être entre ${min} et ${max}`);
      return;
    }

    setError('');
    onSave(localTravelers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-0">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            {t('editTravelers') || 'Modifier le nombre de voyageurs'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-gray)] hover:bg-[var(--color-gray-bg)]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-black)]">
              {t('numberOfTravelers') || 'Nombre de voyageurs'}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (localTravelers > min) {
                    setLocalTravelers(localTravelers - 1);
                    setError('');
                  }
                }}
                disabled={localTravelers <= min}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-gray-light)] bg-white text-[var(--color-black)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--color-gray-bg)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                value={localTravelers}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= min && value <= max) {
                    setLocalTravelers(value);
                    setError('');
                  }
                }}
                min={min}
                max={max}
                className="w-20 rounded-lg border border-[var(--color-gray-light)] bg-white px-4 py-2.5 text-center text-lg font-semibold text-[var(--color-black)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() => {
                  if (localTravelers < max) {
                    setLocalTravelers(localTravelers + 1);
                    setError('');
                  }
                }}
                disabled={localTravelers >= max}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-gray-light)] bg-white text-[var(--color-black)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--color-gray-bg)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-gray)]">
              {t('travelersRangeHint') || `Entre ${min} et ${max} voyageurs`}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-gray-light)] bg-white px-4 py-2.5 font-medium text-[var(--color-black)] transition-colors hover:bg-[var(--color-gray-bg)]"
            >
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              {t('save') || 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
