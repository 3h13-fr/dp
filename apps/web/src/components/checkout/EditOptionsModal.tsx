'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import type { CheckoutOptions } from '@/lib/checkout-state';
import type { ListingOptions } from '@/lib/listing-options';

type EditOptionsModalProps = {
  options: CheckoutOptions;
  listingOptions?: ListingOptions | null;
  listingLatitude?: number | null;
  listingLongitude?: number | null;
  onSave: (options: CheckoutOptions) => void;
  onClose: () => void;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function EditOptionsModal({
  options,
  listingOptions,
  listingLatitude,
  listingLongitude,
  onSave,
  onClose,
}: EditOptionsModalProps) {
  const t = useTranslations('checkout');
  const tReservation = useTranslations('reservation');
  const [localOptions, setLocalOptions] = useState<CheckoutOptions>({ ...options });
  const [deliveryAddress, setDeliveryAddress] = useState(
    options.delivery?.address || '',
  );
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const currency = 'EUR'; // TODO: Get from listing
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const insuranceAvailable = listingOptions?.insurance?.available === true;
  const deliveryAvailable = listingOptions?.delivery?.available === true;

  const handleInsuranceToggle = () => {
    setLocalOptions((prev) => ({
      ...prev,
      insurance: !prev.insurance,
    }));
  };

  const handleGuaranteesToggle = () => {
    setLocalOptions((prev) => ({
      ...prev,
      guarantees: !prev.guarantees,
    }));
  };

  const handleDeliveryToggle = () => {
    const newEnabled = !localOptions.delivery?.enabled;
    if (!newEnabled) {
      setLocalOptions((prev) => ({
        ...prev,
        delivery: {
          enabled: false,
        },
      }));
      setDeliveryAddress('');
      setDeliveryError(null);
    } else {
      setLocalOptions((prev) => ({
        ...prev,
        delivery: {
          enabled: true,
        },
      }));
    }
  };

  const handleDeliveryAddressSelect = (suggestion: AddressSuggestion) => {
    if (!listingLatitude || !listingLongitude) {
      setDeliveryError(
        tReservation('delivery.noListingLocation') || 'Location du listing non disponible',
      );
      return;
    }

    const distance = calculateDistance(
      listingLatitude,
      listingLongitude,
      suggestion.latitude,
      suggestion.longitude,
    );

    const radiusKm = listingOptions?.delivery?.radiusKm || 0;

    if (distance > radiusKm) {
      setDeliveryError(
        tReservation('delivery.outOfRange', {
          distance: distance.toFixed(1),
          radius: radiusKm,
        }) ||
          `L'adresse est à ${distance.toFixed(1)} km, hors du rayon de livraison de ${radiusKm} km`,
      );
      return;
    }

    setDeliveryError(null);
    setDeliveryAddress(suggestion.address);
    setLocalOptions((prev) => ({
      ...prev,
      delivery: {
        enabled: true,
        address: suggestion.address,
        coordinates: {
          lat: suggestion.latitude,
          lng: suggestion.longitude,
        },
      },
    }));
  };

  const handleDeliveryAddressChange = (value: string) => {
    setDeliveryAddress(value);
    if (localOptions.delivery?.enabled) {
      setLocalOptions((prev) => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          address: value,
        },
      }));
    }
  };

  const handleSave = () => {
    onSave(localOptions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-0">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            {t('editOptions') || 'Modifier les options'}
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
          {/* Insurance option */}
          {insuranceAvailable && (
            <label className="flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:border-[var(--color-primary)]/50">
              <input
                type="checkbox"
                checked={localOptions.insurance || false}
                onChange={handleInsuranceToggle}
                className="mt-1 h-5 w-5 cursor-pointer rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-black)]">
                    {t('insurance') || 'Assurance'}
                  </span>
                  {listingOptions?.insurance?.price != null && (
                    <span className="text-sm font-medium text-[var(--color-black)]">
                      +{formatPrice(listingOptions.insurance.price)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
                  {listingOptions?.insurance?.description ||
                    t('insuranceDescription') ||
                    'Protection complète pour votre réservation'}
                </p>
              </div>
            </label>
          )}

          {/* Guarantees option */}
          <label className="flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:border-[var(--color-primary)]/50">
            <input
              type="checkbox"
              checked={localOptions.guarantees || false}
              onChange={handleGuaranteesToggle}
              className="mt-1 h-5 w-5 cursor-pointer rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--color-black)]">
                  {t('guarantees') || 'Garanties supplémentaires'}
                </span>
                <span className="text-sm font-medium text-[var(--color-black)]">
                  +{formatPrice(25)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
                {t('guaranteesDescription') || 'Garanties étendues pour plus de tranquillité'}
              </p>
            </div>
          </label>

          {/* Delivery option */}
          {deliveryAvailable && (
            <div className="rounded-lg border-2 p-4">
              <label className="flex cursor-pointer items-start gap-4">
                <input
                  type="checkbox"
                  checked={localOptions.delivery?.enabled || false}
                  onChange={handleDeliveryToggle}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-black)]">
                      {tReservation('options.delivery') || 'Livraison à domicile'}
                    </span>
                    {(listingOptions?.delivery?.pricePerKm != null || listingOptions?.delivery?.price != null) && (
                      <span className="text-sm font-medium text-[var(--color-black)]">
                        {listingOptions.delivery.pricePerKm != null
                          ? `+${formatPrice(listingOptions.delivery.pricePerKm)} / km`
                          : `+${formatPrice(listingOptions.delivery.price)}`}
                      </span>
                    )}
                  </div>
                  {listingOptions?.delivery?.radiusKm != null && (
                    <p className="mt-1 text-xs text-[var(--color-gray-dark)]">
                      {tReservation('options.deliveryRadius', {
                        radius: listingOptions.delivery.radiusKm,
                      }) || `Dans un rayon de ${listingOptions.delivery.radiusKm} km`}
                    </p>
                  )}
                </div>
              </label>

              {/* Delivery address input */}
              {localOptions.delivery?.enabled && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-[var(--color-gray-dark)]">
                    {tReservation('options.deliveryAddress') || 'Adresse de livraison'}
                  </label>
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onChange={handleDeliveryAddressChange}
                    onSelect={handleDeliveryAddressSelect}
                    placeholder={
                      tReservation('options.deliveryAddressPlaceholder') ||
                      'Saisissez votre adresse'
                    }
                    className="w-full"
                    inputClassName="w-full rounded-lg border border-[var(--color-gray-light)] bg-white px-3 py-2.5 text-sm text-[var(--color-gray-dark)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  {deliveryError && (
                    <p className="text-xs text-red-600">{deliveryError}</p>
                  )}
                  {!deliveryError &&
                    localOptions.delivery?.address &&
                    listingLatitude &&
                    listingLongitude &&
                    localOptions.delivery?.coordinates && (
                      <p className="text-xs text-green-600">
                        {tReservation('options.deliveryValid') ||
                          'Adresse valide pour la livraison'}
                      </p>
                    )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
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
