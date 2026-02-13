'use client';

import { useTranslations } from 'next-intl';
import { CheckoutHeader } from './CheckoutHeader';
import { CheckoutSummary } from './CheckoutSummary';
import { Step1PaymentTiming } from './Step1PaymentTiming';
import { CheckoutStickyBar } from './CheckoutStickyBar';
import type { PaymentTiming, CheckoutOptions } from '@/lib/checkout-state';

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
  options?: { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
};

type CheckoutStep1ReviewProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  startAt: string;
  endAt: string;
  travelers: number;
  options?: CheckoutOptions;
  paymentTiming: PaymentTiming;
  totalAmount: number;
  currency: string;
  onPaymentTimingChange: (timing: PaymentTiming) => void;
  onDatesChange?: (startAt: string, endAt: string) => void;
  onTravelersChange?: (travelers: number) => void;
  onOptionsChange?: (options: CheckoutOptions) => void;
  onContinue: () => void;
};

export function CheckoutStep1Review({
  listing,
  vertical,
  startAt,
  endAt,
  travelers,
  options = {},
  paymentTiming,
  totalAmount,
  currency,
  onPaymentTimingChange,
  onDatesChange,
  onTravelersChange,
  onOptionsChange,
  onContinue,
}: CheckoutStep1ReviewProps) {
  const t = useTranslations('checkout');

  return (
    <div className="min-h-screen bg-[var(--color-gray-bg)] pb-24 lg:pb-0">
      <div className="lg:hidden">
        <CheckoutHeader />
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0 lg:py-0">
        {/* Titre dans le contenu */}
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-black)] lg:text-3xl">
          {t('step1ReviewTitle') || 'Vérifiez et continuez'}
        </h1>

        {/* Carte récap principale */}
        <div className="mb-6">
          <CheckoutSummary
            listing={listing}
            vertical={vertical}
            startAt={startAt}
            endAt={endAt}
            travelers={travelers}
            options={options}
            onDatesChange={onDatesChange}
            onTravelersChange={onTravelersChange}
            onOptionsChange={onOptionsChange}
          />
        </div>

        {/* Section "Choisissez quand vous souhaitez payer" */}
        <Step1PaymentTiming
          paymentTiming={paymentTiming}
          onPaymentTimingChange={onPaymentTimingChange}
          totalAmount={totalAmount}
          currency={currency}
        />
      </div>

      {/* CTA Sticky bottom - seulement sur mobile */}
      <div className="lg:hidden">
        <CheckoutStickyBar
          totalAmount={totalAmount}
          currency={currency}
          onConfirm={onContinue}
          buttonText={t('next') || 'Suivant'}
          loading={false}
          disabled={false}
        />
      </div>
    </div>
  );
}
