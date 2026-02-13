'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type KycModalContextValue = {
  isOpen: boolean;
  kycRequired: boolean;
  openKyc: (required?: boolean) => void;
  close: () => void;
};

const KycModalContext = createContext<KycModalContextValue | null>(null);

export function KycModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);

  const openKyc = useCallback((required = false) => {
    setKycRequired(required);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setKycRequired(false);
  }, []);

  const value: KycModalContextValue = {
    isOpen,
    kycRequired,
    openKyc,
    close,
  };

  return (
    <KycModalContext.Provider value={value}>
      {children}
    </KycModalContext.Provider>
  );
}

export function useKycModal() {
  const ctx = useContext(KycModalContext);
  if (!ctx) {
    throw new Error('useKycModal must be used within KycModalProvider');
  }
  return ctx;
}
