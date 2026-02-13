'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

type EditDatesModalProps = {
  startAt: string;
  endAt: string;
  onSave: (startAt: string, endAt: string) => void;
  onClose: () => void;
};

export function EditDatesModal({ startAt, endAt, onSave, onClose }: EditDatesModalProps) {
  const t = useTranslations('checkout');
  const [localStartAt, setLocalStartAt] = useState(startAt);
  const [localEndAt, setLocalEndAt] = useState(endAt);
  const [error, setError] = useState('');

  useEffect(() => {
    // Convert to datetime-local format
    const toDateTimeLocal = (value: string): string => {
      if (!value) return '';
      if (value.includes('T')) return value.slice(0, 16);
      if (value.length === 10) return `${value}T09:00`;
      return value;
    };
    setLocalStartAt(toDateTimeLocal(startAt));
    setLocalEndAt(toDateTimeLocal(endAt));
  }, [startAt, endAt]);

  const handleSave = () => {
    if (!localStartAt || !localEndAt) {
      setError(t('datesRequired') || 'Les dates sont requises');
      return;
    }

    const start = new Date(localStartAt);
    const end = new Date(localEndAt);

    if (end <= start) {
      setError(t('endDateAfterStart') || 'La date de fin doit être après la date de début');
      return;
    }

    if (start < new Date()) {
      setError(t('startDateFuture') || 'La date de début doit être dans le futur');
      return;
    }

    setError('');
    onSave(localStartAt, localEndAt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-0">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            {t('editDates') || 'Modifier les dates'}
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
              {t('startDate') || 'Date de début'}
            </label>
            <input
              type="datetime-local"
              value={localStartAt}
              onChange={(e) => {
                setLocalStartAt(e.target.value);
                setError('');
              }}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-[var(--color-gray-light)] bg-white px-4 py-2.5 text-sm text-[var(--color-gray-dark)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-black)]">
              {t('endDate') || 'Date de fin'}
            </label>
            <input
              type="datetime-local"
              value={localEndAt}
              onChange={(e) => {
                setLocalEndAt(e.target.value);
                setError('');
              }}
              min={localStartAt || new Date().toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-[var(--color-gray-light)] bg-white px-4 py-2.5 text-sm text-[var(--color-gray-dark)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
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
