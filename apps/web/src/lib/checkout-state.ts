'use client';

import { useState, useEffect, useCallback } from 'react';

export type PaymentTiming = 'immediate' | 'installments';
export type PaymentMethod = 'card' | 'apple_pay' | 'google_pay' | 'paypal';

export type DeliveryOption = {
  enabled: boolean;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type FlexibleReturnOption = {
  enabled: boolean;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type CheckoutOptions = {
  insurance?: boolean;
  insurancePolicyId?: string | null;
  guarantees?: boolean;
  delivery?: DeliveryOption;
  flexibleReturn?: FlexibleReturnOption;
  secondDriver?: {
    enabled: boolean;
    driverInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
  };
};

export type CheckoutState = {
  currentStep: number; // 1, 2, or 3
  startAt: string;
  endAt: string;
  travelers: number;
  options: CheckoutOptions;
  paymentMethod: PaymentMethod | null;
  paymentTiming: PaymentTiming;
};

const STORAGE_KEY = 'checkout_state';

const defaultState: CheckoutState = {
  currentStep: 1,
  startAt: '',
  endAt: '',
  travelers: 1,
  options: {},
  paymentMethod: null,
  paymentTiming: 'immediate',
};

export function useCheckoutState(initialStartAt?: string, initialEndAt?: string) {
  const [state, setState] = useState<CheckoutState>(() => {
    // Try to load from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with initial values if provided
          return {
            ...parsed,
            startAt: initialStartAt || parsed.startAt || '',
            endAt: initialEndAt || parsed.endAt || '',
          };
        }
      } catch {
        // Ignore parse errors
      }
    }
    return {
      ...defaultState,
      startAt: initialStartAt || '',
      endAt: initialEndAt || '',
    };
  });

  // Persist to sessionStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage errors
      }
    }
  }, [state]);

  const updateState = useCallback((updates: Partial<CheckoutState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setStep = useCallback((step: number) => {
    updateState({ currentStep: step });
  }, [updateState]);

  const setDates = useCallback((startAt: string, endAt: string) => {
    updateState({ startAt, endAt });
  }, [updateState]);

  const setTravelers = useCallback((travelers: number) => {
    updateState({ travelers });
  }, [updateState]);

  const setOptions = useCallback((options: CheckoutOptions) => {
    updateState({ options });
  }, [updateState]);

  const setPaymentMethod = useCallback((method: PaymentMethod | null) => {
    updateState({ paymentMethod: method });
  }, [updateState]);

  const setPaymentTiming = useCallback((timing: PaymentTiming) => {
    updateState({ paymentTiming: timing });
  }, [updateState]);

  const reset = useCallback(() => {
    setState({
      ...defaultState,
      startAt: initialStartAt || '',
      endAt: initialEndAt || '',
    });
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, [initialStartAt, initialEndAt]);

  return {
    state,
    setStep,
    setDates,
    setTravelers,
    setOptions,
    setPaymentMethod,
    setPaymentTiming,
    updateState,
    reset,
  };
}
