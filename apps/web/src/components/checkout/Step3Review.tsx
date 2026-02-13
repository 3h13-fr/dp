'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';
import { CheckoutHeader } from './CheckoutHeader';
import { CheckoutSummary } from './CheckoutSummary';
import { PaymentScheduleSection } from './PaymentScheduleSection';
import { PaymentMethodSection } from './PaymentMethodSection';
import { TravelInsuranceCard } from './TravelInsuranceCard';
import { PriceBreakdown } from './PriceBreakdown';
import { CheckoutStickyBar } from './CheckoutStickyBar';
import { RarityMessage } from './RarityMessage';
import { calculateListingPrice, calculateOptionsPrice, type ListingForPricing } from '@/lib/pricing';
import type { PaymentMethod, CheckoutOptions, PaymentTiming } from '@/lib/checkout-state';
import type { ListingOptions } from '@/lib/listing-options';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  displayTitle?: string | null;
  type?: string;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  caution?: { toNumber?: () => number } | number | null;
  cancellationPolicy?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
  options?: ListingOptions | null;
};

type Step3ReviewProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  startAt: string;
  endAt: string;
  travelers: number;
  options: CheckoutOptions;
  paymentMethod: PaymentMethod | null;
  paymentTiming: PaymentTiming;
  totalAmount: number;
  currency: string;
  onPaymentScheduleClick?: () => void;
  onPaymentMethodClick?: () => void;
};

export function Step3Review({
  listing,
  vertical,
  startAt,
  endAt,
  travelers,
  options,
  paymentMethod,
  paymentTiming,
  totalAmount,
  currency,
  onPaymentScheduleClick,
  onPaymentMethodClick,
}: Step3ReviewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tErrors = useTranslations('errors');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [insuranceAdded, setInsuranceAdded] = useState(options.insurance || false);

  // Calculate final total with updated insurance state
  const updatedOptions = { ...options, insurance: insuranceAdded };
  const basePriceCalculation = calculateListingPrice(startAt, endAt, {
    pricePerDay: listing.pricePerDay,
    currency: listing.currency,
    options: listing.options,
  });
  const basePrice = basePriceCalculation?.finalPrice ?? 0;
  const listingCoords = listing.latitude != null && listing.longitude != null
    ? { lat: listing.latitude, lng: listing.longitude }
    : null;
  const optionsPrice = calculateOptionsPrice(updatedOptions, listing.options, listingCoords);
  const finalTotal = basePrice + optionsPrice;

  // Calculate individual option prices for PriceBreakdown component
  const insurancePrice = insuranceAdded && listing.options?.insurance?.price != null ? listing.options.insurance.price : 0;
  const guaranteesPrice = updatedOptions.guarantees ? 25 : 0; // Default price

  const listingForPricing: ListingForPricing = {
    pricePerDay: listing.pricePerDay,
    currency: listing.currency,
    options: listing.options,
  };

  const handleConfirm = async () => {
    if (!getToken()) {
      router.push(`/${locale}/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!paymentMethod) {
      setError(t('selectPaymentMethod') || 'Veuillez sélectionner un mode de paiement');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create booking
      const bookingRes = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          options: updatedOptions,
        }),
      });

      if (!bookingRes.ok) {
        const bookingData = await bookingRes.json();
        throw new Error(bookingData.message ?? (tErrors('generic') || 'Erreur lors de la création de la réservation'));
      }

      const booking = await bookingRes.json();

      // Redirect to payment page
      router.push(`/${locale}/bookings/${booking.id}/pay`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErrors('generic') || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-gray-bg)] pb-24 lg:pb-0">
      <div className="lg:hidden">
        <CheckoutHeader />
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0 lg:py-0">
        {/* Titre dans le contenu */}
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-black)] lg:text-3xl">
          {t('step3ConfirmTitle') || 'Confirmer et payer'}
        </h1>

        {/* Récap identique à l'écran 1 */}
        <div className="mb-6">
          <CheckoutSummary
            listing={listing}
            vertical={vertical}
            startAt={startAt}
            endAt={endAt}
            travelers={travelers}
            options={{ ...options, insurance: insuranceAdded }}
          />
        </div>

        {/* Sections cliquables */}
        <div className="mb-6 space-y-4">
          <PaymentScheduleSection
            paymentTiming={paymentTiming}
            totalAmount={totalAmount}
            currency={currency}
            onClick={onPaymentScheduleClick || (() => {})}
          />
          <PaymentMethodSection
            paymentMethod={paymentMethod}
            onClick={onPaymentMethodClick || (() => {})}
          />
        </div>

        {/* Assurance facultative */}
        {!insuranceAdded && (
          <div className="mb-6">
            <TravelInsuranceCard
              insurancePrice={15}
              currency={currency}
              onAdd={() => setInsuranceAdded(true)}
              added={false}
            />
          </div>
        )}

        {/* Détail du prix */}
        <div className="mb-6 rounded-[var(--radius-card-medium)] bg-white p-6 shadow-[var(--shadow-soft)]">
          {/* PriceBreakdown component needs to be updated to use calculateOptionsPrice, but for now we calculate manually */}
          <PriceBreakdown
            startAt={startAt}
            endAt={endAt}
            listing={listingForPricing}
            insurancePrice={insurancePrice}
            guaranteesPrice={guaranteesPrice}
            currency={currency}
            showDetails={showPriceDetails}
            onToggleDetails={() => setShowPriceDetails(!showPriceDetails)}
          />
        </div>

        {/* Message de rareté répété */}
        <div className="mb-6">
          <RarityMessage />
        </div>

        {/* Mentions légales */}
        <div className="mb-6 text-xs text-[var(--color-gray)]">
          <p>
            {t('legalAcceptance') || 'En sélectionnant le bouton, j\'accepte les conditions de réservation et les Conditions de service modifiées. '}
            <a href={`/${locale}/terms`} className="underline">
              {t('viewTerms') || 'Consultez la Politique de confidentialité.'}
            </a>
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Bouton desktop */}
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !paymentMethod}
            className="w-full rounded-[var(--radius-button)] bg-[var(--color-black)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--color-gray-dark)] disabled:opacity-50"
          >
            {loading
              ? t('confirming') || 'Confirmation...'
              : paymentMethod === 'google_pay'
                ? 'G Pay Google Pay'
                : paymentMethod === 'apple_pay'
                  ? 'Apple Pay'
                  : t('confirmAndPay') || `Confirmer et payer ${finalTotal.toFixed(2)} ${currency}`}
          </button>
        </div>
      </div>

      {/* CTA Sticky bottom - seulement sur mobile */}
      <div className="lg:hidden">
        <CheckoutStickyBar
          totalAmount={finalTotal}
          currency={currency}
          onConfirm={handleConfirm}
          loading={loading}
          disabled={!paymentMethod}
          paymentMethod={paymentMethod}
        />
      </div>
    </div>
  );
}
