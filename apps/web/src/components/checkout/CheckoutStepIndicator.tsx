'use client';

import { useTranslations } from 'next-intl';

type CheckoutStepIndicatorProps = {
  currentStep: number; // 1, 2, or 3
};

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
  const t = useTranslations('checkout');

  const steps = [
    { number: 1, label: t('step1Label') || 'Quand payer' },
    { number: 2, label: t('step2Label') || 'Mode de paiement' },
    { number: 3, label: t('step3Label') || 'Vérification' },
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex flex-1 items-center">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                currentStep === step.number
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : currentStep > step.number
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-gray-light)] bg-white text-[var(--color-gray)]'
              }`}
            >
              {currentStep > step.number ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-2 hidden text-xs font-medium md:block ${
                currentStep >= step.number ? 'text-[var(--color-black)]' : 'text-[var(--color-gray)]'
              }`}
            >
              {step.label}
            </span>
          </div>
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              className={`mx-2 h-0.5 flex-1 transition-colors ${
                currentStep > step.number ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-gray-light)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
