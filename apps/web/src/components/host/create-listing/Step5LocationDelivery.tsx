'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export type LocationDeliveryData = {
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  deliveryAvailable: boolean;
  deliveryRadiusKm: number;
  deliveryPrice: number;
};

type Step5LocationDeliveryProps = {
  data: LocationDeliveryData;
  onChange: (data: LocationDeliveryData) => void;
  onNext: () => void;
  onBack: () => void;
};

const defaultData: LocationDeliveryData = {
  address: '',
  city: '',
  country: '',
  deliveryAvailable: false,
  deliveryRadiusKm: 10,
  deliveryPrice: 0,
};

export function Step5LocationDelivery({ data, onChange, onNext, onBack }: Step5LocationDeliveryProps) {
  const t = useTranslations('createListing');
  const [d, setD] = useState<LocationDeliveryData>({ ...defaultData, ...data });

  const update = (partial: Partial<LocationDeliveryData>) => {
    const next = { ...d, ...partial };
    setD(next);
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step5Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step5AddressPrivate')}</p>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">{t('address')}</span>
          <input
            type="text"
            value={d.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder={t('addressPlaceholder')}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">{t('city')}</span>
            <input
              type="text"
              value={d.city}
              onChange={(e) => update({ city: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('country')}</span>
            <input
              type="text"
              value={d.country}
              onChange={(e) => update({ country: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>
      </div>
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
              <span className="text-sm font-medium">{t('deliveryPrice')}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={d.deliveryPrice}
                onChange={(e) => update({ deliveryPrice: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          </div>
        )}
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
