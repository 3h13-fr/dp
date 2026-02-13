'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckoutHeader } from './CheckoutHeader';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CheckoutStickyBar } from './CheckoutStickyBar';
import type { PaymentMethod } from '@/lib/checkout-state';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Step2PaymentMethodProps = {
  paymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (method: PaymentMethod | null) => void;
  onContinue: () => void;
  totalAmount: number;
  currency: string;
};

function CardPaymentForm({ onContinue }: { onContinue: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('checkout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    // For now, just validate the form
    // Actual payment will happen in step 3
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? (t('paymentError') || 'Erreur de paiement'));
      setLoading(false);
      return;
    }

    setLoading(false);
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function Step2PaymentMethod({
  paymentMethod,
  onPaymentMethodChange,
  onContinue,
  totalAmount,
  currency,
}: Step2PaymentMethodProps) {
  const t = useTranslations('checkout');

  const handleMethodSelect = (method: PaymentMethod) => {
    onPaymentMethodChange(method);
  };

  const handleContinue = () => {
    if (paymentMethod) {
      onContinue();
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
          {t('step2AddPaymentTitle') || 'Ajoutez un mode de paiement'}
        </h1>

        {/* Liste verticale dans une card */}
        <div className="rounded-[var(--radius-card-medium)] bg-white shadow-[var(--shadow-soft)]">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodSelect={handleMethodSelect}
          />

          {/* Card payment form - seulement visible si carte sélectionnée */}
          {paymentMethod === 'card' && stripePromise && (
            <div className="border-t border-[var(--color-gray-light)] px-6 py-4">
              <Elements
                stripe={stripePromise}
                options={{
                  mode: 'payment',
                  amount: Math.round(totalAmount * 100), // Convert to cents
                  currency: currency.toLowerCase(),
                  appearance: { theme: 'stripe' },
                }}
              >
                <CardPaymentForm onContinue={handleContinue} />
              </Elements>
            </div>
          )}
        </div>
      </div>

      {/* CTA Sticky bottom - seulement sur mobile */}
      <div className="lg:hidden">
        <CheckoutStickyBar
          totalAmount={totalAmount}
          currency={currency}
          onConfirm={handleContinue}
          buttonText={t('next') || 'Suivant'}
          loading={false}
          disabled={!paymentMethod}
        />
      </div>
    </div>
  );
}
