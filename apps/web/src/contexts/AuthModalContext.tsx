'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export type AuthModalMode = 'login' | 'signup';

type AuthModalContextValue = {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectParam: string | null;
  openLogin: (redirect?: string) => void;
  openSignup: () => void;
  close: () => void;
  switchToLogin: () => void;
  switchToSignup: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('login');
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  const openLogin = useCallback((redirect?: string) => {
    setRedirectParam(redirect ?? null);
    setMode('login');
    setIsOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setRedirectParam(null);
    setMode('signup');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setRedirectParam(null);
    setMode('login');
  }, []);

  const switchToLogin = useCallback(() => setMode('login'), []);
  const switchToSignup = useCallback(() => setMode('signup'), []);

  const value: AuthModalContextValue = {
    isOpen,
    mode,
    redirectParam,
    openLogin,
    openSignup,
    close,
    switchToLogin,
    switchToSignup,
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
