'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { MapWithRadius } from './MapWithRadius';

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type DeliveryAddressSheetProps = {
  open: boolean;
  onClose: () => void;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  currentAddress?: string;
  currentCoordinates?: { lat: number; lng: number };
  onConfirm: (address: string, coordinates: { lat: number; lng: number }) => void;
  isMobile?: boolean;
};

export function DeliveryAddressSheet({
  open,
  onClose,
  centerLat,
  centerLng,
  radiusKm,
  currentAddress = '',
  currentCoordinates,
  onConfirm,
  isMobile = false,
}: DeliveryAddressSheetProps) {
  const t = useTranslations('reservation');
  const tListing = useTranslations('listing');
  const tCommon = useTranslations('common');
  const [address, setAddress] = useState(currentAddress);
  const [coordinates, setCoordinates] = useState(currentCoordinates);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    address.trim().length > 0 &&
    coordinates != null &&
    haversineKm(centerLat, centerLng, coordinates.lat, coordinates.lng) <=
      radiusKm;

  const handleSelect = (suggestion: AddressSuggestion) => {
    const distance = haversineKm(
      centerLat,
      centerLng,
      suggestion.latitude,
      suggestion.longitude
    );
    if (distance > radiusKm) {
      setError(
        t('delivery.outOfRange', {
          distance: distance.toFixed(1),
          radius: radiusKm,
        }) ||
          `L'adresse est à ${distance.toFixed(1)} km, hors du rayon de livraison de ${radiusKm} km`
      );
      return;
    }
    setError(null);
    setAddress(suggestion.address);
    setCoordinates({ lat: suggestion.latitude, lng: suggestion.longitude });
  };

  const handleConfirm = () => {
    if (!isValid || !coordinates) return;
    onConfirm(address, coordinates);
    onClose();
  };

  if (!open) return null;

  const content = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-black)]">
        {tListing('deliveryTitle') || 'Livraison du véhicule'}
      </h3>
      <p className="text-sm text-[var(--color-gray-dark)]">
        {tListing('deliveryRadiusInfo', { radius: radiusKm }) ||
          `Livraison disponible dans un rayon de ${radiusKm} km`}
      </p>
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-gray-dark)]">
          {t('options.deliveryAddress') || 'Adresse de livraison'}
        </label>
        <AddressAutocomplete
          value={address}
          onChange={(v) => {
            setAddress(v);
            if (!v) setCoordinates(undefined);
          }}
          onSelect={handleSelect}
          placeholder={t('options.deliveryAddressPlaceholder') || 'Saisissez votre adresse'}
          className="w-full"
          inputClassName="w-full rounded-lg border border-[var(--color-gray-light)] bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        {isValid && (
          <p className="mt-2 text-sm text-green-600">
            {t('options.deliveryValid') || 'Adresse valide pour la livraison'}
          </p>
        )}
      </div>
      <MapWithRadius
        centerLat={centerLat}
        centerLng={centerLng}
        radiusKm={radiusKm}
        selectedLat={coordinates?.lat}
        selectedLng={coordinates?.lng}
        selectedAddress={isValid ? address : undefined}
        height={200}
      />
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-[70] bg-black/40"
          aria-hidden
          onClick={onClose}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-[71] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-gray-light)] bg-white p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-sheet-title"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="delivery-sheet-title" className="text-lg font-semibold">
              {tListing('deliveryTitle') || 'Livraison du véhicule'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--color-gray-dark)] hover:bg-[var(--color-gray-light)]/50"
              aria-label={tCommon('close')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {content}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-gray-light)] px-4 py-3 font-medium text-[var(--color-gray-dark)]"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tListing('confirm') || tCommon('save')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-modal-title"
      >
        <div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="delivery-modal-title" className="text-lg font-semibold">
              {tListing('deliveryTitle') || 'Livraison du véhicule'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--color-gray-dark)] hover:bg-[var(--color-gray-light)]/50"
              aria-label={tCommon('close')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {content}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-gray-light)] px-4 py-3 font-medium text-[var(--color-gray-dark)]"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tListing('confirm') || tCommon('save')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
