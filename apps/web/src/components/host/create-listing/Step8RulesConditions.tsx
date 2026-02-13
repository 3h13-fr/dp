'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export type RulesConditionsData = {
  // Conditions d'utilisation
  smokingAllowed: boolean;
  petsAllowed: boolean;
  musicAllowed: boolean;
  tollsIncluded: boolean;
  fuelPolicy: 'full_to_full' | 'full_to_empty' | 'same_level'; // Plein/plein, plein/vide, même niveau
  maxMileagePerDay: number | null; // Kilométrage journalier (km/jour)
  excessMileagePricePerKm: number | null; // Montant par km en cas de dépassement (€/km)
  // Conditions locataires
  minDriverAge: number;
  minLicenseYears: number;
  requireInternationalLicense: boolean; // Exiger permis international
  // Restrictions
  allowedCountries: string[]; // Pays autorisés pour conduire
  forbiddenZones: Array<{ name: string; radius: number }>; // Zones interdites
  // Règles de retour
  returnFuelLevel: 'full' | 'same' | 'any'; // Niveau carburant retour
  returnCleaningRequired: boolean;
  returnChecklist: string[]; // Checklist de retour
};

type Step8RulesConditionsProps = {
  data: RulesConditionsData;
  onChange: (data: RulesConditionsData) => void;
  onNext: () => void;
  onBack: () => void;
  mode?: 'create' | 'edit';
};

const defaultData: RulesConditionsData = {
  smokingAllowed: false,
  petsAllowed: false,
  musicAllowed: true,
  tollsIncluded: false,
  fuelPolicy: 'full_to_full',
  maxMileagePerDay: null,
  excessMileagePricePerKm: null,
  minDriverAge: 21,
  minLicenseYears: 1,
  requireInternationalLicense: false,
  allowedCountries: [],
  forbiddenZones: [],
  returnFuelLevel: 'full',
  returnCleaningRequired: false,
  returnChecklist: [],
};

export function Step8RulesConditions({ data, onChange, onNext, onBack, mode = 'create' }: Step8RulesConditionsProps) {
  const t = useTranslations('createListing');
  const [d, setD] = useState<RulesConditionsData>({ ...defaultData, ...data });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    usage: true,
    renter: true,
    restrictions: false,
    return: false,
  });

  const update = (partial: Partial<RulesConditionsData>) => {
    const next = { ...d, ...partial };
    setD(next);
    onChange(next);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step8Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step8Desc')}</p>

      {/* Conditions d'utilisation */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('usage')}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>{t('usageConditions')}</span>
          <span>{expandedSections.usage ? '−' : '+'}</span>
        </button>
        {expandedSections.usage && (
          <div className="border-t p-4 space-y-4">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.smokingAllowed}
                  onChange={(e) => update({ smokingAllowed: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <span>{t('smokingAllowed')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.petsAllowed}
                  onChange={(e) => update({ petsAllowed: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <span>{t('petsAllowed')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.musicAllowed}
                  onChange={(e) => update({ musicAllowed: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <span>{t('musicAllowed')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.tollsIncluded}
                  onChange={(e) => update({ tollsIncluded: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <span>{t('tollsIncluded')}</span>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">{t('fuelPolicy')}</span>
              <select
                value={d.fuelPolicy}
                onChange={(e) => update({ fuelPolicy: e.target.value as RulesConditionsData['fuelPolicy'] })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="full_to_full">{t('fullToFull')}</option>
                <option value="full_to_empty">{t('fullToEmpty')}</option>
                <option value="same_level">{t('sameLevel')}</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">{t('maxMileagePerDay')}</span>
              <input
                type="number"
                min={0}
                value={d.maxMileagePerDay ?? ''}
                onChange={(e) => update({ maxMileagePerDay: e.target.value ? parseInt(e.target.value, 10) : null })}
                placeholder={t('unlimited')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('excessMileagePricePerKm') || 'Montant par km en cas de dépassement (€)'}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.excessMileagePricePerKm ?? ''}
                onChange={(e) => update({ excessMileagePricePerKm: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder={t('unlimited')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          </div>
        )}
      </div>

      {/* Conditions locataires */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('renter')}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>{t('renterConditions')}</span>
          <span>{expandedSections.renter ? '−' : '+'}</span>
        </button>
        {expandedSections.renter && (
          <div className="border-t p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('minDriverAge')}</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={d.minDriverAge}
                  onChange={(e) => update({ minDriverAge: parseInt(e.target.value, 10) || 21 })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('minLicenseYears')}</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={d.minLicenseYears}
                  onChange={(e) => update({ minLicenseYears: parseInt(e.target.value, 10) || 1 })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Restrictions */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('restrictions')}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>{t('restrictions')}</span>
          <span>{expandedSections.restrictions ? '−' : '+'}</span>
        </button>
        {expandedSections.restrictions && (
          <div className="border-t p-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">{t('allowedCountries')}</span>
              <input
                type="text"
                placeholder={t('allowedCountriesPlaceholder')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('allowedCountriesDesc')}</p>
            </label>
          </div>
        )}
      </div>

      {/* Règles de retour */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection('return')}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>{t('returnRules')}</span>
          <span>{expandedSections.return ? '−' : '+'}</span>
        </button>
        {expandedSections.return && (
          <div className="border-t p-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">{t('returnFuelLevel')}</span>
              <select
                value={d.returnFuelLevel}
                onChange={(e) => update({ returnFuelLevel: e.target.value as RulesConditionsData['returnFuelLevel'] })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="full">{t('full')}</option>
                <option value="same">{t('sameLevel')}</option>
                <option value="any">{t('any')}</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={d.returnCleaningRequired}
                onChange={(e) => update({ returnCleaningRequired: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <span>{t('returnCleaningRequired')}</span>
            </label>
          </div>
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
