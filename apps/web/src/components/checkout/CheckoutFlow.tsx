'use client';

import { CheckoutStepIndicator } from './CheckoutStepIndicator';
import { Step1PaymentTiming } from './Step1PaymentTiming';
import { Step2PaymentMethod } from './Step2PaymentMethod';
import type { PaymentTiming, PaymentMethod } from '@/lib/checkout-state';

type CheckoutFlowProps = {
  currentStep: number;
  paymentTiming: PaymentTiming;
  paymentMethod: PaymentMethod | null;
  totalAmount: number;
  currency: string;
  onStepChange: (step: number) => void;
  onPaymentTimingChange: (timing: PaymentTiming) => void;
  onPaymentMethodChange: (method: PaymentMethod | null) => void;
  step3Content?: React.ReactNode; // Step 3 content (Step3Review)
};

export function CheckoutFlow({
  currentStep,
  paymentTiming,
  paymentMethod,
  totalAmount,
  currency,
  onStepChange,
  onPaymentTimingChange,
  onPaymentMethodChange,
  step3Content,
}: CheckoutFlowProps) {
  const handleStep1Continue = () => {
    onStepChange(2);
  };

  const handleStep2Continue = () => {
    onStepChange(3);
  };

  return (
    <div className="space-y-6">
      <CheckoutStepIndicator currentStep={currentStep} />

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1PaymentTiming
            paymentTiming={paymentTiming}
            onPaymentTimingChange={onPaymentTimingChange}
            onContinue={handleStep1Continue}
          />
        )}

        {currentStep === 2 && (
          <Step2PaymentMethod
            paymentMethod={paymentMethod}
            onPaymentMethodChange={onPaymentMethodChange}
            onContinue={handleStep2Continue}
            totalAmount={totalAmount}
            currency={currency}
          />
        )}

        {currentStep === 3 && <div>{step3Content}</div>}
      </div>
    </div>
  );
}
