'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReservationInsuranceBlock } from './ReservationInsuranceBlock';
import { ReservationSecondDriverBlock } from './ReservationSecondDriverBlock';
import { DeliveryAddressSheet } from './DeliveryAddressSheet';
import { FlexibleReturnSheet } from './FlexibleReturnSheet';
import type { CheckoutOptions } from '@/lib/checkout-state';
import type { ListingOptions } from '@/lib/listing-options';

type Listing = {
  id: string;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
  options?: ListingOptions | null;
};

type ReservationOptionsProps = {
  listing: Listing;
  selectedOptions: CheckoutOptions;
  onOptionsChange: (options: CheckoutOptions) => void;
  startAt?: string;
  endAt?: string;
  days?: number;
  currency?: string;
  isMobile?: boolean;
};

export function ReservationOptions({
  listing,
  selectedOptions,
  onOptionsChange,
  days = 1,
  currency = 'EUR',
  isMobile = false,
}: ReservationOptionsProps) {
  const t = useTranslations('listing');
  const tReservation = useTranslations('reservation');
  const listingOptions = listing.options || {};
  const listingType = listing.type || 'CAR_RENTAL';

  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);

  const insurancePolicies = (listingOptions.insurance as { policies?: Array<{ id: string; name: string }> } | undefined)
    ?.policies;
  const insuranceAvailable =
    (Array.isArray(insurancePolicies) && insurancePolicies.length > 0) ||
    listingOptions.insurance?.available === true;
  const deliveryAvailable = listingOptions.delivery?.available === true;
  const secondDriverAvailable = listingOptions.secondDriver?.available === true;
  const flexibleReturnAvailable =
    (listingOptions.pickup as { returnMethod?: string } | undefined)?.returnMethod === 'different';

  const listingLat = listing.latitude ?? 0;
  const listingLng = listing.longitude ?? 0;
  const deliveryRadiusKm = listingOptions.delivery?.radiusKm ?? 15;
  const returnRadiusKm =
    (listingOptions.pickup as { returnMaxDistanceKm?: number } | undefined)?.returnMaxDistanceKm ?? 50;

  const hasListingCoords = listing.latitude != null && listing.longitude != null;

  const handleInsurancePolicyChange = (policyId: string | null) => {
    if (Array.isArray(insurancePolicies) && insurancePolicies.length > 0) {
      onOptionsChange({
        ...selectedOptions,
        insurance: !!policyId,
        insurancePolicyId: policyId ?? undefined,
      });
    } else {
      onOptionsChange({
        ...selectedOptions,
        insurance: !!policyId,
        insurancePolicyId: policyId ? 'default' : undefined,
      });
    }
  };

  const deliveryChecked =
    (selectedOptions.delivery?.enabled && !!selectedOptions.delivery?.address) ?? false;

  const handleDeliveryToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (deliveryChecked) {
      onOptionsChange({
        ...selectedOptions,
        delivery: { enabled: false },
      });
    } else {
      e.preventDefault();
      setDeliverySheetOpen(true);
    }
  };

  const handleDeliveryConfirm = (address: string, coordinates: { lat: number; lng: number }) => {
    onOptionsChange({
      ...selectedOptions,
      delivery: {
        enabled: true,
        address,
        coordinates,
      },
    });
    setDeliverySheetOpen(false);
  };

  const flexibleReturnChecked =
    (selectedOptions.flexibleReturn?.enabled && !!selectedOptions.flexibleReturn?.address) ?? false;

  const handleFlexibleReturnToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (flexibleReturnChecked) {
      onOptionsChange({
        ...selectedOptions,
        flexibleReturn: { enabled: false },
      });
    } else {
      e.preventDefault();
      setReturnSheetOpen(true);
    }
  };

  const handleFlexibleReturnConfirm = (
    address: string,
    coordinates: { lat: number; lng: number }
  ) => {
    onOptionsChange({
      ...selectedOptions,
      flexibleReturn: {
        enabled: true,
        address,
        coordinates,
      },
    });
    setReturnSheetOpen(false);
  };

  if (listingType !== 'CAR_RENTAL') {
    return null;
  }

  if (!insuranceAvailable && !deliveryAvailable && !secondDriverAvailable && !flexibleReturnAvailable) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Insurance */}
      {insuranceAvailable && (
        <ReservationInsuranceBlock
          policies={insurancePolicies}
          legacyInsurance={
            !Array.isArray(insurancePolicies) || insurancePolicies.length === 0
              ? {
                  available: listingOptions.insurance?.available,
                  price: listingOptions.insurance?.price,
                  description: listingOptions.insurance?.description,
                }
              : undefined
          }
          selectedPolicyId={
            selectedOptions.insurancePolicyId ?? (selectedOptions.insurance ? 'default' : null)
          }
          onPolicyChange={handleInsurancePolicyChange}
          currency={currency}
          days={days}
        />
      )}

      {/* Second driver */}
      {secondDriverAvailable && (
        <ReservationSecondDriverBlock
          available={true}
          price={listingOptions.secondDriver?.price}
          checked={selectedOptions.secondDriver?.enabled ?? false}
          onToggle={(enabled) =>
            onOptionsChange({
              ...selectedOptions,
              secondDriver: { ...selectedOptions.secondDriver, enabled },
            })
          }
          currency={currency}
        />
      )}

      {/* Delivery */}
      {deliveryAvailable && (
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
            deliveryChecked
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-gray-light)] hover:border-[var(--color-primary)]/30'
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-gray-light)]/50">
            <svg
              className="h-5 w-5 text-[var(--color-gray-dark)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-[var(--color-black)]">
              {t('deliveryTitle') || tReservation('options.delivery')}
            </span>
            <p className="mt-0.5 text-xs text-[var(--color-gray-dark)]">
              {t('deliveryRadiusInfo', { radius: deliveryRadiusKm }) ||
                `Livraison disponible dans un rayon de ${deliveryRadiusKm} km`}
            </p>
          </div>
          <input
            type="checkbox"
            checked={deliveryChecked}
            onChange={handleDeliveryToggle}
            className="h-5 w-5 rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Flexible return */}
      {flexibleReturnAvailable && (
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
            flexibleReturnChecked
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-gray-light)] hover:border-[var(--color-primary)]/30'
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-gray-light)]/50">
            <svg
              className="h-5 w-5 text-[var(--color-gray-dark)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-[var(--color-black)]">
              {t('flexibleReturnTitle') || 'Retour à une adresse différente'}
            </span>
            <p className="mt-0.5 text-xs text-[var(--color-gray-dark)]">
              {t('flexibleReturnRadiusInfo', { radius: returnRadiusKm }) ||
                `Retour autorisé dans un rayon de ${returnRadiusKm} km`}
            </p>
          </div>
          <input
            type="checkbox"
            checked={flexibleReturnChecked}
            onChange={handleFlexibleReturnToggle}
            className="h-5 w-5 rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        </label>
      )}

      {/* Delivery address sheet */}
      {deliveryAvailable && hasListingCoords && (
        <DeliveryAddressSheet
          open={deliverySheetOpen}
          onClose={() => setDeliverySheetOpen(false)}
          centerLat={listingLat}
          centerLng={listingLng}
          radiusKm={deliveryRadiusKm}
          currentAddress={selectedOptions.delivery?.address}
          currentCoordinates={selectedOptions.delivery?.coordinates}
          onConfirm={handleDeliveryConfirm}
          isMobile={isMobile}
        />
      )}

      {/* Flexible return sheet */}
      {flexibleReturnAvailable && hasListingCoords && (
        <FlexibleReturnSheet
          open={returnSheetOpen}
          onClose={() => setReturnSheetOpen(false)}
          centerLat={listingLat}
          centerLng={listingLng}
          radiusKm={returnRadiusKm}
          currentAddress={selectedOptions.flexibleReturn?.address}
          currentCoordinates={selectedOptions.flexibleReturn?.coordinates}
          onConfirm={handleFlexibleReturnConfirm}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
