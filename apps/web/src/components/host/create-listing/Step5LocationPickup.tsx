'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { AddressMapPicker } from '@/components/AddressMapPicker';

export type LocationPickupData = {
  address: string;
  city?: string; // Extracted automatically from address
  country?: string; // Extracted automatically from address
  latitude?: number; // Extracted automatically from address
  longitude?: number; // Extracted automatically from address
  // Modes de remise
  pickupMethod: 'handover' | 'keybox'; // main propre / boîte à clés
  keyboxCode?: string;
  returnMethod: 'same' | 'different'; // même lieu / différent
  returnAddress?: string;
  returnCity?: string;
  returnCountry?: string;
  returnMaxDistanceKm?: number; // Distance max du lieu de retour (km)
  returnPricePerKm?: number; // Prix au km (€/km)
  // Livraison
  deliveryAvailable: boolean;
  deliveryRadiusKm: number; // Distance max (km)
  deliveryPricePerKm: number; // Prix au km (€/km)
  hourlyDeliveryAvailable?: boolean;
  deliveryPricePerHour?: number | null;
  // Lieux prédéfinis (optionnel, section avancée)
  predefinedLocations?: Array<{ id: string; name: string; address: string }>;
};

type Step5LocationPickupProps = {
  data: LocationPickupData;
  onChange: (data: LocationPickupData) => void;
  onNext: () => void;
  onBack: () => void;
  mode?: 'create' | 'edit';
};

const defaultData: LocationPickupData = {
  address: '',
  pickupMethod: 'handover',
  returnMethod: 'same',
  deliveryAvailable: false,
  deliveryRadiusKm: 50,
  deliveryPricePerKm: 0,
};

export function Step5LocationPickup({ data, onChange, onNext, onBack, mode = 'create' }: Step5LocationPickupProps) {
  const t = useTranslations('createListing');
  const [d, setD] = useState<LocationPickupData>({ ...defaultData, ...data });

  const update = (partial: Partial<LocationPickupData>) => {
    const next = { ...d, ...partial };
    setD(next);
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step5Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step5AddressPrivate')}</p>

      {/* Localisation principale */}
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">{t('address')}</span>
          <AddressAutocomplete
            value={d.address}
            onChange={(address) => update({ address })}
            onSelect={(suggestion) => {
              update({
                address: suggestion.address,
                city: suggestion.city,
                country: suggestion.country,
                latitude: suggestion.latitude,
                longitude: suggestion.longitude,
              });
            }}
            placeholder={t('addressPlaceholder')}
            className="mt-1"
          />
        </label>
        {(d.city || d.country) && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-muted-foreground">
              {[d.city, d.country].filter(Boolean).join(', ')}
              {d.latitude != null && d.longitude != null && (
                <span className="ml-2 text-xs">
                  ({d.latitude.toFixed(4)}, {d.longitude.toFixed(4)})
                </span>
              )}
            </p>
          </div>
        )}
        {d.latitude != null && d.longitude != null && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">{t('mapPreview') || 'Déplacez le marqueur pour mettre à jour l\'adresse'}</p>
            <AddressMapPicker
              latitude={d.latitude}
              longitude={d.longitude}
              address={d.address}
              onPositionChange={(lat, lng, suggestion) => {
                update({
                  address: suggestion.address,
                  city: suggestion.city,
                  country: suggestion.country,
                  latitude: lat,
                  longitude: lng,
                });
              }}
              height={200}
            />
          </div>
        )}
      </div>

      {/* Modes de remise */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium mb-4">{t('pickupMethod')}</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
            <input
              type="radio"
              name="pickupMethod"
              value="handover"
              checked={d.pickupMethod === 'handover'}
              onChange={(e) => update({ pickupMethod: e.target.value as 'handover' })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('pickupHandover')}</span>
              <p className="text-sm text-muted-foreground">{t('pickupHandoverDesc')}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
            <input
              type="radio"
              name="pickupMethod"
              value="keybox"
              checked={d.pickupMethod === 'keybox'}
              onChange={(e) => update({ pickupMethod: e.target.value as 'keybox' })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('pickupKeybox')}</span>
              <p className="text-sm text-muted-foreground">{t('pickupKeyboxDesc')}</p>
            </div>
          </label>
        </div>
        {d.pickupMethod === 'keybox' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">{t('keyboxCode') || 'Code du boîtier'}</label>
            <input
              type="text"
              value={d.keyboxCode ?? ''}
              onChange={(e) => update({ keyboxCode: e.target.value })}
              placeholder={t('keyboxCodePlaceholder') || 'Ex: 1234'}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </div>
        )}
      </div>

      {/* Mode de récupération */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium mb-4">{t('returnMethod')}</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
            <input
              type="radio"
              name="returnMethod"
              value="same"
              checked={d.returnMethod === 'same'}
              onChange={(e) => update({ returnMethod: e.target.value as 'same' })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('returnSame')}</span>
              <p className="text-sm text-muted-foreground">{t('returnSameDesc')}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
            <input
              type="radio"
              name="returnMethod"
              value="different"
              checked={d.returnMethod === 'different'}
              onChange={(e) => update({ returnMethod: e.target.value as 'different' })}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">{t('returnDifferent')}</span>
              <p className="text-sm text-muted-foreground">{t('returnDifferentDesc')}</p>
            </div>
          </label>
        </div>
        {d.returnMethod === 'different' && (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">{t('returnAddress')}</span>
              <input
                type="text"
                value={d.returnAddress || ''}
                onChange={(e) => update({ returnAddress: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('returnCity')}</span>
                <input
                  type="text"
                  value={d.returnCity || ''}
                  onChange={(e) => update({ returnCity: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('returnCountry')}</span>
                <input
                  type="text"
                  value={d.returnCountry || ''}
                  onChange={(e) => update({ returnCountry: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('returnMaxDistanceKm') || 'Distance max du lieu de retour (km)'}</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={d.returnMaxDistanceKm ?? 50}
                  onChange={(e) => update({ returnMaxDistanceKm: parseInt(e.target.value, 10) || undefined })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('returnPricePerKm') || 'Prix au km (€)'}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={d.returnPricePerKm ?? 0}
                  onChange={(e) => update({ returnPricePerKm: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Livraison */}
      <div className="border-t border-border pt-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={d.deliveryAvailable}
            onChange={(e) => update({ deliveryAvailable: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <span className="font-medium">{t('deliveryOffer')}</span>
        </label>
        {d.deliveryAvailable && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">{t('deliveryRadiusKm')}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={d.deliveryRadiusKm}
                onChange={(e) => update({ deliveryRadiusKm: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('deliveryPricePerKm') || 'Prix au km (€)'}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.deliveryPricePerKm ?? 0}
                onChange={(e) => update({ deliveryPricePerKm: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
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
