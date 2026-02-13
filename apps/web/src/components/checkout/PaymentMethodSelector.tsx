'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { PaymentMethod } from '@/lib/checkout-state';

type PaymentMethodSelectorProps = {
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
};

export function PaymentMethodSelector({
  selectedMethod,
  onMethodSelect,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('checkout');
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Pay is available
    if (typeof window !== 'undefined' && (window as any).ApplePaySession) {
      const canMakePayments = (window as any).ApplePaySession.canMakePayments();
      setApplePayAvailable(canMakePayments);
    }

    // Check if Google Pay is available
    if (typeof window !== 'undefined' && (window as any).google?.payments?.api?.PaymentsClient) {
      setGooglePayAvailable(true);
    }

    // Sélectionner carte bancaire par défaut si aucune méthode n'est sélectionnée
    if (!selectedMethod) {
      onMethodSelect('card');
    }
  }, [selectedMethod, onMethodSelect]);

  const methods: Array<{
    id: PaymentMethod;
    label: string;
    icon?: React.ReactNode;
    available: boolean;
  }> = [
    {
      id: 'card',
      label: t('paymentMethodCard') || 'Carte de crédit ou de débit',
      icon: (
        <div className="flex items-center gap-1">
          <svg className="h-6 w-8" viewBox="0 0 24 16" fill="none">
            <rect x="0.5" y="0.5" width="23" height="15" rx="1.5" stroke="currentColor" fill="white" />
            <rect x="2" y="4" width="20" height="1.5" fill="currentColor" />
            <rect x="2" y="7" width="8" height="1.5" fill="currentColor" />
          </svg>
          <span className="text-xs font-semibold text-[var(--color-gray)]">VISA</span>
          <span className="text-xs font-semibold text-[var(--color-gray)]">AMEX</span>
        </div>
      ),
      available: true,
    },
    {
      id: 'paypal',
      label: t('paymentMethodPayPal') || 'PayPal',
      icon: (
        <div className="h-6 w-20">
          <span className="text-sm font-semibold text-blue-600">PayPal</span>
        </div>
      ),
      available: false, // TODO: Enable when PayPal integration is ready
    },
    {
      id: 'google_pay',
      label: t('paymentMethodGooglePay') || 'Google Pay',
      icon: (
        <div className="h-6 w-20">
          <span className="text-sm font-semibold text-[var(--color-black)]">G Pay</span>
        </div>
      ),
      available: googlePayAvailable,
    },
    {
      id: 'apple_pay',
      label: t('paymentMethodApplePay') || 'Apple Pay',
      icon: (
        <div className="h-6 w-20">
          <span className="text-sm font-semibold text-[var(--color-black)]">Apple Pay</span>
        </div>
      ),
      available: applePayAvailable,
    },
  ];

  return (
    <div className="space-y-0 divide-y divide-[var(--color-gray-light)]">
      {methods.map((method, index) => (
        <label
          key={method.id}
          className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors first:rounded-t-[var(--radius-card-medium)] last:rounded-b-[var(--radius-card-medium)] ${
            selectedMethod === method.id
              ? 'bg-[var(--color-gray-bg)]'
              : method.available
                ? 'hover:bg-[var(--color-gray-bg)]'
                : 'cursor-not-allowed opacity-50'
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center text-[var(--color-gray)]">
            {method.icon}
          </div>
          <div className="flex-1">
            <div className="font-medium text-[var(--color-black)]">{method.label}</div>
            {!method.available && method.id === 'paypal' && (
              <p className="mt-1 text-xs text-[var(--color-gray)]">
                {t('comingSoon') || 'Bientôt disponible'}
              </p>
            )}
          </div>
          <input
            type="radio"
            name="paymentMethod"
            value={method.id}
            checked={selectedMethod === method.id}
            onChange={() => method.available && onMethodSelect(method.id)}
            disabled={!method.available}
            className="h-5 w-5 cursor-pointer text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </label>
      ))}
    </div>
  );
}
