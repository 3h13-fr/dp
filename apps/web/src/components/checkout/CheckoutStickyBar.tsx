'use client';

import { useTranslations } from 'next-intl';
import type { PaymentMethod } from '@/lib/checkout-state';

type CheckoutStickyBarProps = {
  totalAmount: number;
  currency: string;
  onConfirm: () => void;
  loading?: boolean;
  disabled?: boolean;
  buttonText?: string;
  paymentMethod?: PaymentMethod | null;
};

export function CheckoutStickyBar({
  totalAmount,
  currency,
  onConfirm,
  loading = false,
  disabled = false,
  buttonText,
  paymentMethod,
}: CheckoutStickyBarProps) {
  const t = useTranslations('checkout');
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const getButtonContent = () => {
    if (loading) {
      return t('confirming') || 'Confirmation...';
    }

    if (buttonText) {
      return buttonText;
    }

    // Si wallet natif, afficher le bouton wallet
    if (paymentMethod === 'google_pay') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">G Pay</span>
          <span>Google Pay</span>
        </div>
      );
    }

    if (paymentMethod === 'apple_pay') {
      return 'Apple Pay';
    }

    return t('confirmAndPay') || `Confirmer et payer ${formatPrice(totalAmount)}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white p-4 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] lg:hidden">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || loading}
          className="w-full rounded-[var(--radius-button)] bg-[var(--color-black)] px-6 py-4 font-semibold text-white transition-colors hover:bg-[var(--color-gray-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getButtonContent()}
        </button>
      </div>
    </div>
  );
}
