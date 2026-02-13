'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export type AvailabilityBookingRulesData = {
  // Disponibilités
  bufferHours: number; // Temps tampon entre locations
  autoUnavailableAfterDays: number | null; // Indisponibilité après longue location
  rejectIsolatedGaps: boolean; // Refus trous isolés
  allowedTimeSlots: Array<{ start: string; end: string }>; // Plages horaires
  forbiddenDepartureDays: number[]; // Jours interdits (0=dimanche, 6=samedi)
  // Règles de réservation
  minBookingNoticeHours: number; // Délai minimum de préavis
  maxBookingAdvanceDays: number; // Délai maximum à l'avance
  allowLastMinute: boolean; // Autoriser réservations dernière minute
  minRentalDurationHours: number; // Durée minimale (heures)
  maxRentalDurationDays: number; // Durée maximale (jours)
  instantBooking: boolean; // Réservation instantanée
  manualApprovalRequired: boolean; // Validation manuelle obligatoire
  manualApprovalAfterDays: number | null; // Validation manuelle au-delà de X jours
};

type Step7AvailabilityBookingRulesProps = {
  data: AvailabilityBookingRulesData;
  onChange: (data: AvailabilityBookingRulesData) => void;
  onNext: () => void;
  onBack: () => void;
  mode?: 'create' | 'edit';
};

const defaultData: AvailabilityBookingRulesData = {
  bufferHours: 2,
  autoUnavailableAfterDays: null,
  rejectIsolatedGaps: false,
  allowedTimeSlots: [{ start: '00:00', end: '23:59' }],
  forbiddenDepartureDays: [],
  minBookingNoticeHours: 24,
  maxBookingAdvanceDays: 180,
  allowLastMinute: true,
  minRentalDurationHours: 24,
  maxRentalDurationDays: 30,
  instantBooking: true,
  manualApprovalRequired: false,
  manualApprovalAfterDays: null,
};

export function Step7AvailabilityBookingRules({ data, onChange, onNext, onBack, mode = 'create' }: Step7AvailabilityBookingRulesProps) {
  const t = useTranslations('createListing');
  const [d, setD] = useState<AvailabilityBookingRulesData>({ ...defaultData, ...data });

  const update = (partial: Partial<AvailabilityBookingRulesData>) => {
    const next = { ...d, ...partial };
    setD(next);
    onChange(next);
  };

  const daysOfWeek = [
    { value: 0, label: t('sunday') },
    { value: 1, label: t('monday') },
    { value: 2, label: t('tuesday') },
    { value: 3, label: t('wednesday') },
    { value: 4, label: t('thursday') },
    { value: 5, label: t('friday') },
    { value: 6, label: t('saturday') },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step7Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step7Desc')}</p>

      {/* Disponibilités */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium mb-4">{t('availabilitySettings')}</h3>
        
        <label className="block mb-4">
          <span className="text-sm font-medium">{t('bufferHours')}</span>
          <input
            type="number"
            min={0}
            max={24}
            value={d.bufferHours}
            onChange={(e) => update({ bufferHours: parseInt(e.target.value, 10) || 0 })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('bufferHoursDesc')}</p>
        </label>

        <label className="flex cursor-pointer items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={d.rejectIsolatedGaps}
            onChange={(e) => update({ rejectIsolatedGaps: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <div>
            <span className="font-medium">{t('rejectIsolatedGaps')}</span>
            <p className="text-sm text-muted-foreground">{t('rejectIsolatedGapsDesc')}</p>
          </div>
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium">{t('forbiddenDepartureDays')}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <label key={day.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2">
                <input
                  type="checkbox"
                  checked={d.forbiddenDepartureDays.includes(day.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      update({ forbiddenDepartureDays: [...d.forbiddenDepartureDays, day.value] });
                    } else {
                      update({ forbiddenDepartureDays: d.forbiddenDepartureDays.filter((d) => d !== day.value) });
                    }
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </label>
      </div>

      {/* Règles de réservation */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium mb-4">{t('bookingRules')}</h3>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <label className="block">
            <span className="text-sm font-medium">{t('minBookingNotice')}</span>
            <select
              value={d.minBookingNoticeHours}
              onChange={(e) => update({ minBookingNoticeHours: parseInt(e.target.value, 10) })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value={12}>12 {t('hours')}</option>
              <option value={24}>24 {t('hours')}</option>
              <option value={48}>48 {t('hours')}</option>
              <option value={72}>72 {t('hours')}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('maxBookingAdvance')}</span>
            <select
              value={Math.min(d.maxBookingAdvanceDays, 60)}
              onChange={(e) => update({ maxBookingAdvanceDays: Math.min(parseInt(e.target.value, 10), 60) })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            >
              <option value={7}>7 {t('days')}</option>
              <option value={14}>14 {t('days')}</option>
              <option value={30}>30 {t('days')}</option>
              <option value={60}>60 {t('days')} (max)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{t('maxBookingAdvanceLimit') || 'Maximum 60 jours à l\'avance'}</p>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={d.allowLastMinute}
            onChange={(e) => update({ allowLastMinute: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <span className="font-medium">{t('allowLastMinute')}</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <label className="block">
            <span className="text-sm font-medium">{t('minRentalDuration')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={d.minRentalDurationHours}
                onChange={(e) => update({ minRentalDurationHours: parseInt(e.target.value, 10) || 24 })}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              <span className="text-sm text-muted-foreground">{t('hours')}</span>
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('maxRentalDuration')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={d.maxRentalDurationDays}
                onChange={(e) => update({ maxRentalDurationDays: parseInt(e.target.value, 10) || 30 })}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              <span className="text-sm text-muted-foreground">{t('days')}</span>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
            <input
              type="radio"
              name="bookingMode"
              checked={d.instantBooking}
              onChange={() => update({ instantBooking: true, manualApprovalRequired: false })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('instantBooking')}</span>
              <p className="text-sm text-muted-foreground">{t('instantBookingDesc')}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
            <input
              type="radio"
              name="bookingMode"
              checked={d.manualApprovalRequired}
              onChange={() => update({ instantBooking: false, manualApprovalRequired: true })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('manualApproval')}</span>
              <p className="text-sm text-muted-foreground">{t('manualApprovalDesc')}</p>
            </div>
          </label>
        </div>

        {d.manualApprovalRequired && (
          <label className="block mt-4">
            <span className="text-sm font-medium">{t('manualApprovalAfterDays')}</span>
            <input
              type="number"
              min={1}
              value={d.manualApprovalAfterDays ?? 7}
              onChange={(e) => update({ manualApprovalAfterDays: parseInt(e.target.value, 10) || null })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('manualApprovalAfterDaysDesc')}</p>
          </label>
        )}
      </div>

      {mode === 'create' && (
        <div className="flex justify-between">
          <button type="button" onClick={onBack} className="rounded-lg border border-border px-6 py-2.5 font-medium">
            {t('back')}
          </button>
          <button type="button" onClick={onNext} className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground">
            {t('next')}
          </button>
        </div>
      )}
    </div>
  );
}
