'use client';

import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useCheckoutState } from '@/lib/checkout-state';
import { calculateListingPrice, calculateOptionsPrice, type ListingForPricing } from '@/lib/pricing';
import { CheckoutStep1Review } from './CheckoutStep1Review';
import { Step2PaymentMethod } from './Step2PaymentMethod';
import { Step3Review } from './Step3Review';
import { CheckoutSummary } from './CheckoutSummary';
import { CheckoutStepIndicator } from './CheckoutStepIndicator';

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
  latitude?: number | null;
  longitude?: number | null;
  options?: ListingOptions | null;
};

type CheckoutPageContentProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
};

function toNum(v: { toNumber?: () => number } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  return Number(v);
}

export function CheckoutPageContent({ listing, vertical }: CheckoutPageContentProps) {
  const searchParams = useSearchParams();
  const locale = useLocale();

  // Get initial dates and options from URL params
  const initialStartAt = searchParams.get('startAt') || '';
  const initialEndAt = searchParams.get('endAt') || '';
  const optionsParam = searchParams.get('options');
  let initialOptions = {};
  if (optionsParam) {
    try {
      initialOptions = JSON.parse(optionsParam);
    } catch {
      // Ignore parse errors
    }
  }

  const {
    state,
    setStep,
    setDates,
    setTravelers,
    setOptions,
    setPaymentMethod,
    setPaymentTiming,
  } = useCheckoutState(initialStartAt, initialEndAt);

  // Set initial options if provided
  useEffect(() => {
    if (Object.keys(initialOptions).length > 0) {
      setOptions(initialOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate total amount
  const { subtotal, totalAmount } = useMemo(() => {
    if (!state.startAt || !state.endAt) {
      return { subtotal: 0, totalAmount: 0 };
    }

    const listingForPricing: ListingForPricing = {
      pricePerDay: listing.pricePerDay,
      currency: listing.currency,
      options: listing.options,
    };

    const priceCalculation = calculateListingPrice(state.startAt, state.endAt, listingForPricing);
    const subtotal = priceCalculation?.finalPrice ?? 0;
    const listingCoords = listing.latitude != null && listing.longitude != null
      ? { lat: listing.latitude, lng: listing.longitude }
      : null;
    const optionsPrice = calculateOptionsPrice(state.options, listing.options, listingCoords);
    const totalAmount = subtotal + optionsPrice;

    return { subtotal, totalAmount };
  }, [state.startAt, state.endAt, state.options, listing]);

  const currency = listing.currency ?? 'EUR';

  const handleStep1Continue = () => {
    setStep(2);
  };

  const handleStep2Continue = () => {
    setStep(3);
  };

  return (
    <>
      {/* Mobile: Full screen layout avec écrans complets */}
      <div className="block lg:hidden">
        {state.currentStep === 1 && (
          <CheckoutStep1Review
            listing={listing}
            vertical={vertical}
            startAt={state.startAt}
            endAt={state.endAt}
            travelers={state.travelers}
            options={state.options}
            paymentTiming={state.paymentTiming}
            totalAmount={totalAmount}
            currency={currency}
            onPaymentTimingChange={setPaymentTiming}
            onDatesChange={setDates}
            onTravelersChange={setTravelers}
            onOptionsChange={setOptions}
            onContinue={handleStep1Continue}
          />
        )}

        {state.currentStep === 2 && (
          <Step2PaymentMethod
            paymentMethod={state.paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onContinue={handleStep2Continue}
            totalAmount={totalAmount}
            currency={currency}
          />
        )}

        {state.currentStep === 3 && (
          <Step3Review
            listing={listing}
            vertical={vertical}
            startAt={state.startAt}
            endAt={state.endAt}
            travelers={state.travelers}
            options={state.options}
            paymentMethod={state.paymentMethod}
            paymentTiming={state.paymentTiming}
            totalAmount={totalAmount}
            currency={currency}
            onPaymentScheduleClick={() => setStep(1)}
            onPaymentMethodClick={() => setStep(2)}
          />
        )}
      </div>

      {/* Desktop: 2 columns layout (65% gauche, 35% droite) */}
      <div className="hidden lg:block lg:bg-[var(--color-gray-bg)] lg:min-h-screen">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[65%_35%] lg:gap-8 lg:px-8 lg:py-8">
          {/* Left: Étapes numérotées (une seule étape ouverte à la fois) */}
          <div className="space-y-6">
            <CheckoutStepIndicator currentStep={state.currentStep} />

            {state.currentStep === 1 && (
              <div className="rounded-[var(--radius-card-medium)] bg-white p-8 shadow-[var(--shadow-soft)]">
                <CheckoutStep1Review
                  listing={listing}
                  vertical={vertical}
                  startAt={state.startAt}
                  endAt={state.endAt}
                  travelers={state.travelers}
                  options={state.options}
                  paymentTiming={state.paymentTiming}
                  totalAmount={totalAmount}
                  currency={currency}
                  onPaymentTimingChange={setPaymentTiming}
                  onDatesChange={setDates}
                  onTravelersChange={setTravelers}
                  onOptionsChange={setOptions}
                  onContinue={handleStep1Continue}
                />
              </div>
            )}

            {state.currentStep === 2 && (
              <div className="rounded-[var(--radius-card-medium)] bg-white p-8 shadow-[var(--shadow-soft)]">
                <Step2PaymentMethod
                  paymentMethod={state.paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  onContinue={handleStep2Continue}
                  totalAmount={totalAmount}
                  currency={currency}
                />
              </div>
            )}

            {state.currentStep === 3 && (
              <div className="rounded-[var(--radius-card-medium)] bg-white p-8 shadow-[var(--shadow-soft)]">
                <Step3Review
                  listing={listing}
                  vertical={vertical}
                  startAt={state.startAt}
                  endAt={state.endAt}
                  travelers={state.travelers}
                  options={state.options}
                  paymentMethod={state.paymentMethod}
                  paymentTiming={state.paymentTiming}
                  totalAmount={totalAmount}
                  currency={currency}
                  onPaymentScheduleClick={() => setStep(1)}
                  onPaymentMethodClick={() => setStep(2)}
                />
              </div>
            )}
          </div>

          {/* Right: Card récap sticky (toujours visible) */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <CheckoutSummary
              listing={listing}
              vertical={vertical}
              startAt={state.startAt}
              endAt={state.endAt}
              travelers={state.travelers}
              options={state.options}
              onDatesChange={setDates}
              onTravelersChange={setTravelers}
              onOptionsChange={setOptions}
            />
          </div>
        </div>
      </div>
    </>
  );
}
