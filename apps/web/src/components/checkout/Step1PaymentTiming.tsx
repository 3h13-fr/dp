'use client';

import { useTranslations } from 'next-intl';
import type { PaymentTiming } from '@/lib/checkout-state';

type Step1PaymentTimingProps = {
  paymentTiming: PaymentTiming;
  onPaymentTimingChange: (timing: PaymentTiming) => void;
  totalAmount: number;
  currency: string;
};

export function Step1PaymentTiming({
  paymentTiming,
  onPaymentTimingChange,
  totalAmount,
  currency,
}: Step1PaymentTimingProps) {
  const t = useTranslations('checkout');
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;
  const installmentAmount = (totalAmount / 3).toFixed(2);

  return (
    <div className="rounded-[var(--radius-card-medium)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-black)]">
        {t('choosePaymentTiming') || 'Choisissez quand vous souhaitez payer'}
      </h3>

      <div className="space-y-3">
        {/* Paiement immédiat */}
        <label
          className={`flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors ${
            paymentTiming === 'immediate'
              ? 'bg-[var(--color-gray-bg)]'
              : 'hover:bg-[var(--color-gray-bg)]'
          }`}
        >
          <div className="flex-1">
            <div className="font-medium text-[var(--color-black)]">
              {t('payNow', { amount: formatPrice(totalAmount) }) || `Payer ${formatPrice(totalAmount)} maintenant`}
            </div>
          </div>
          <input
            type="radio"
            name="paymentTiming"
            value="immediate"
            checked={paymentTiming === 'immediate'}
            onChange={(e) => onPaymentTimingChange(e.target.value as PaymentTiming)}
            className="h-5 w-5 cursor-pointer text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </label>

        {/* Paiement en plusieurs fois */}
        <label
          className={`flex cursor-pointer items-start gap-4 rounded-lg p-4 transition-colors ${
            paymentTiming === 'installments'
              ? 'bg-[var(--color-gray-bg)]'
              : 'hover:bg-[var(--color-gray-bg)]'
          }`}
        >
          <div className="flex-1">
            <div className="font-medium text-[var(--color-black)]">
              {t('payInInstallments') || 'Payer en 3 fois avec Klarna'}
            </div>
            <p className="mt-1 text-sm text-[var(--color-gray)]">
              {t('installmentDetails', { amount: formatPrice(Number(installmentAmount)) }) || `3 versements de ${formatPrice(Number(installmentAmount))}. `}
              <span className="underline">
                {t('moreInfo') || 'Plus d\'informations'}
              </span>
            </p>
          </div>
          <input
            type="radio"
            name="paymentTiming"
            value="installments"
            checked={paymentTiming === 'installments'}
            onChange={(e) => onPaymentTimingChange(e.target.value as PaymentTiming)}
            className="mt-1 h-5 w-5 cursor-pointer text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </label>
      </div>
    </div>
  );
}
