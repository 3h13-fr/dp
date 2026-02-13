'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export type PricingData = {
  pricePerDay: number;
  priceWeekend: number | null;
  priceWeek: number | null;
  priceMonth: number | null;
  hourlyAllowed: boolean;
  pricePerHour: number | null;
  caution: number | null;
  description: string;
  // Tarification avancée (optionnel)
  durationDiscount3Days?: number | null; // Réduction % pour 3+ jours
  durationDiscount7Days?: number | null; // Réduction % pour 7+ jours
  // Frais additionnels
  youngDriverFee?: number | null;
  optionFees?: Record<string, number>; // GPS: 10, siège bébé: 5, etc.
  // Tarifs chauffeur (si véhicule avec chauffeur)
  chauffeurDaily?: number | null; // Tarif journalier avec chauffeur
  chauffeurPromo3Days?: number | null; // Promo j+3
  chauffeurPromo7Days?: number | null; // Promo j+7
  chauffeurPromo30Days?: number | null; // Promo j+30
};

type Step6PricingProps = {
  data: PricingData;
  onChange: (data: PricingData) => void;
  onNext: () => void;
  onBack: () => void;
  mode?: 'create' | 'edit';
  vehicleMode?: 'location' | 'chauffeur' | 'both'; // Mode du véhicule pour déterminer les onglets
};

const defaultPricing: PricingData = {
  pricePerDay: 0,
  priceWeekend: null,
  priceWeek: null,
  priceMonth: null,
  hourlyAllowed: false,
  pricePerHour: null,
  caution: null,
  description: '',
  durationDiscount3Days: null,
  durationDiscount7Days: null,
  youngDriverFee: null,
  optionFees: {},
  chauffeurDaily: null,
  chauffeurPromo3Days: null,
  chauffeurPromo7Days: null,
  chauffeurPromo30Days: null,
};

export function Step6Pricing({ data, onChange, onNext, onBack, mode = 'create', vehicleMode = 'location' }: Step6PricingProps) {
  const t = useTranslations('createListing');
  const [d, setD] = useState<PricingData>({ ...defaultPricing, ...data });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'rental' | 'chauffeur'>('rental');
  
  // Si véhicule avec ET sans chauffeur, afficher les onglets
  const showTabs = vehicleMode === 'both';
  // Si uniquement chauffeur, afficher directement les tarifs chauffeur
  const isChauffeurOnly = vehicleMode === 'chauffeur';

  const update = (partial: Partial<PricingData>) => {
    const next = { ...d, ...partial };
    setD(next);
    onChange(next);
  };

  const canSubmit = 
    (activeTab === 'rental' || !showTabs) && !isChauffeurOnly
      ? (d.pricePerDay > 0 || (d.hourlyAllowed && (d.pricePerHour ?? 0) > 0))
      : (d.chauffeurDaily ?? 0) > 0;

  // Calcul du prix avec réduction pour affichage
  const calculatePriceWithDiscount = (days: number) => {
    if (!d.pricePerDay) return null;
    let price = d.pricePerDay * days;
    if (days >= 7 && d.durationDiscount7Days) {
      price = price * (1 - d.durationDiscount7Days / 100);
    } else if (days >= 3 && d.durationDiscount3Days) {
      price = price * (1 - d.durationDiscount3Days / 100);
    }
    return price.toFixed(2);
  };

  // Calcul du total chauffeur avec promotions
  const calculateChauffeurTotal = (days: number) => {
    if (!d.chauffeurDaily) return null;
    let dailyRate = d.chauffeurDaily;
    
    if (days >= 30 && d.chauffeurPromo30Days) {
      dailyRate = d.chauffeurPromo30Days;
    } else if (days >= 7 && d.chauffeurPromo7Days) {
      dailyRate = d.chauffeurPromo7Days;
    } else if (days >= 3 && d.chauffeurPromo3Days) {
      dailyRate = d.chauffeurPromo3Days;
    }
    
    const total = dailyRate * days;
    const originalTotal = d.chauffeurDaily * days;
    const savings = originalTotal - total;
    
    return {
      total: total.toFixed(2),
      dailyRate: dailyRate.toFixed(2),
      originalTotal: originalTotal.toFixed(2),
      savings: savings > 0 ? savings.toFixed(2) : null,
    };
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step6Title')}</h2>

      {/* Onglets pour véhicule avec ET sans chauffeur */}
      {showTabs && (
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('rental')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rental'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('rentalPricing') || 'Location'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chauffeur')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'chauffeur'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('chauffeurPricing') || 'Avec chauffeur'}
          </button>
        </div>
      )}

      {/* Contenu selon l'onglet actif ou le mode */}
      {(activeTab === 'rental' || !showTabs) && !isChauffeurOnly && (
        <>
          {/* Tarifs de base */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('pricePerDay')} *</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={d.pricePerDay || ''}
                    onChange={(e) => update({ pricePerDay: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border px-3 py-2"
                  />
                  <span className="text-sm text-muted-foreground">EUR</span>
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('priceWeekend')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.priceWeekend ?? ''}
                  onChange={(e) => update({ priceWeekend: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder={t('optional')}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('priceWeek')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.priceWeek ?? ''}
                  onChange={(e) => update({ priceWeek: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder={t('optional')}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('priceMonth')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.priceMonth ?? ''}
                  onChange={(e) => update({ priceMonth: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder={t('optional')}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>

            <div className="border-t border-border pt-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.hourlyAllowed}
                  onChange={(e) => update({ hourlyAllowed: e.target.checked, pricePerHour: e.target.checked ? d.pricePerHour : null })}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="font-medium">{t('hourlyRentalAllowed')}</span>
              </label>
              {d.hourlyAllowed && (
                <label className="mt-4 block">
                  <span className="text-sm font-medium">{t('pricePerHour')} *</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={d.pricePerHour ?? ''}
                    onChange={(e) => update({ pricePerHour: e.target.value ? parseFloat(e.target.value) : null })}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Tarification avancée (collapsible) */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-left font-medium"
            >
              <span>{t('advancedPricing')}</span>
              <span>{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">{t('discount3Days')}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={d.durationDiscount3Days ?? ''}
                        onChange={(e) => update({ durationDiscount3Days: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="10"
                        className="w-full rounded-lg border border-border px-3 py-2"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    {d.durationDiscount3Days && d.pricePerDay && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('example')}: {calculatePriceWithDiscount(3)} EUR {t('for')} 3 {t('days')}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">{t('discount7Days')}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={d.durationDiscount7Days ?? ''}
                        onChange={(e) => update({ durationDiscount7Days: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="15"
                        className="w-full rounded-lg border border-border px-3 py-2"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    {d.durationDiscount7Days && d.pricePerDay && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('example')}: {calculatePriceWithDiscount(7)} EUR {t('for')} 7 {t('days')}
                      </p>
                    )}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Frais additionnels */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium mb-4">{t('additionalFees')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('youngDriverFee')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.youngDriverFee ?? ''}
                  onChange={(e) => update({ youngDriverFee: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder={t('optional')}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">{t('caution')}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.caution ?? ''}
                onChange={(e) => update({ caution: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder={t('optional')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t('description')}</span>
            <textarea
              value={d.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </>
      )}

      {/* Tarifs chauffeur */}
      {(activeTab === 'chauffeur' || isChauffeurOnly) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('chauffeurPricing') || 'Tarifs avec chauffeur'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">{t('chauffeurDaily') || 'Tarif journalier'} *</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.chauffeurDaily ?? ''}
                  onChange={(e) => update({ chauffeurDaily: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
                <span className="text-sm text-muted-foreground">EUR</span>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('chauffeurPromo3Days') || 'Promo 3 jours'}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.chauffeurPromo3Days ?? ''}
                onChange={(e) => update({ chauffeurPromo3Days: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder={t('optional')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('promo3DaysDesc') || 'Tarif pour 3 jours ou plus'}</p>
              {d.chauffeurPromo3Days && d.chauffeurDaily && (
                <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <p className="text-sm font-medium text-primary">
                    {t('simulation') || 'Simulation'} : {calculateChauffeurTotal(3)?.total} EUR {t('for') || 'pour'} 3 {t('days') || 'jours'}
                  </p>
                  {calculateChauffeurTotal(3)?.savings && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('savings') || 'Économie'} : {calculateChauffeurTotal(3)?.savings} EUR ({t('insteadOf') || 'au lieu de'} {calculateChauffeurTotal(3)?.originalTotal} EUR)
                    </p>
                  )}
                </div>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('chauffeurPromo7Days') || 'Promo 7 jours'}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.chauffeurPromo7Days ?? ''}
                onChange={(e) => update({ chauffeurPromo7Days: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder={t('optional')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('promo7DaysDesc') || 'Tarif pour 7 jours ou plus'}</p>
              {d.chauffeurPromo7Days && d.chauffeurDaily && (
                <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <p className="text-sm font-medium text-primary">
                    {t('simulation') || 'Simulation'} : {calculateChauffeurTotal(7)?.total} EUR {t('for') || 'pour'} 7 {t('days') || 'jours'}
                  </p>
                  {calculateChauffeurTotal(7)?.savings && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('savings') || 'Économie'} : {calculateChauffeurTotal(7)?.savings} EUR ({t('insteadOf') || 'au lieu de'} {calculateChauffeurTotal(7)?.originalTotal} EUR)
                    </p>
                  )}
                </div>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('chauffeurPromo30Days') || 'Promo 30 jours'}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.chauffeurPromo30Days ?? ''}
                onChange={(e) => update({ chauffeurPromo30Days: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder={t('optional')}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('promo30DaysDesc') || 'Tarif pour 30 jours ou plus'}</p>
              {d.chauffeurPromo30Days && d.chauffeurDaily && (
                <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <p className="text-sm font-medium text-primary">
                    {t('simulation') || 'Simulation'} : {calculateChauffeurTotal(30)?.total} EUR {t('for') || 'pour'} 30 {t('days') || 'jours'}
                  </p>
                  {calculateChauffeurTotal(30)?.savings && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('savings') || 'Économie'} : {calculateChauffeurTotal(30)?.savings} EUR ({t('insteadOf') || 'au lieu de'} {calculateChauffeurTotal(30)?.originalTotal} EUR)
                    </p>
                  )}
                </div>
              )}
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t('description')}</span>
            <textarea
              value={d.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex justify-between">
          <button type="button" onClick={onBack} className="rounded-lg border border-border px-6 py-2.5 font-medium">
            {t('back')}
          </button>
          <div className="flex flex-col items-end gap-2">
            {!canSubmit && (
              <p className="text-xs text-red-600">
                {activeTab === 'chauffeur' || isChauffeurOnly
                  ? t('chauffeurDailyRequired') || 'Le tarif journalier avec chauffeur est requis'
                  : t('pricePerDayRequired') || 'Le tarif journalier est requis'}
              </p>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!canSubmit}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
