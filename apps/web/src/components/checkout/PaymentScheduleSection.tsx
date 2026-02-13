'use client';

import { useTranslations } from 'next-intl';
import type { PaymentTiming } from '@/lib/checkout-state';

type PaymentScheduleSectionProps = {
  paymentTiming: PaymentTiming;
  totalAmount: number;
  currency: string;
  onClick: () => void;
};

export function PaymentScheduleSection({
  paymentTiming,
  totalAmount,
  currency,
  onClick,
}: PaymentScheduleSectionProps) {
  const t = useTranslations('checkout');
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const getDisplayText = () => {
    if (paymentTiming === 'immediate') {
      return t('payNow', { amount: formatPrice(totalAmount) }) || `Payer ${formatPrice(totalAmount)} maintenant`;
    }
    return t('payInInstallments') || 'Payer en 3 fois avec Klarna';
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
            {t('paymentSchedule') || 'Calendrier des paiements'}
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
