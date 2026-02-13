'use client';

import { useTranslations } from 'next-intl';
import type { PaymentMethod } from '@/lib/checkout-state';

type PaymentMethodSectionProps = {
  paymentMethod: PaymentMethod | null;
  onClick: () => void;
};

export function PaymentMethodSection({ paymentMethod, onClick }: PaymentMethodSectionProps) {
  const t = useTranslations('checkout');

  const getDisplayText = () => {
    if (!paymentMethod) return t('selectPaymentMethod') || 'Sélectionner un mode de paiement';
    
    switch (paymentMethod) {
      case 'card':
        return t('paymentMethodCard') || 'Carte de crédit ou de débit';
      case 'paypal':
        return t('paymentMethodPayPal') || 'PayPal';
      case 'google_pay':
        return 'G Pay Google Pay';
      case 'apple_pay':
        return 'Apple Pay';
      default:
        return t('paymentMethod') || 'Mode de paiement';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[var(--radius-card-medium)] bg-white p-6 shadow-[var(--shadow-soft)] text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-black)]">
            {t('paymentMethod') || 'Mode de paiement'}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {getDisplayText()}
          </p>
        </div>
        <svg
          className="h-5 w-5 text-[var(--color-gray)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
