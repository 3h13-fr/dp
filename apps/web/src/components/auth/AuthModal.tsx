'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { AuthOverlay } from '@/components/AuthOverlay';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

export function AuthModal() {
  const router = useRouter();
  const locale = useLocale();
  const { isOpen, mode, redirectParam, close, switchToLogin, switchToSignup } = useAuthModal();
  const tLogin = useTranslations('login');
  const tSignup = useTranslations('signup');

  const handleForgotPassword = useCallback(() => {
    close();
    router.push(`/${locale}/forgot-password`);
  }, [close, router, locale]);

  const handleSwitchToSignup = useCallback(() => {
    close();
    router.push(`/${locale}/signup`);
  }, [close, router, locale]);

  if (!isOpen) return null;

  const ariaLabel = mode === 'signup' ? tSignup('title') : tLogin('titleUnified');

  return (
    <AuthOverlay open={isOpen} onClose={close} aria-label={ariaLabel}>
      {mode === 'signup' ? (
        <SignupForm
          onSuccess={close}
          onSwitchToLogin={switchToLogin}
          redirectParam={redirectParam}
        />
      ) : (
        <LoginForm
          onSuccess={close}
          onForgotPassword={handleForgotPassword}
          onSwitchToSignup={handleSwitchToSignup}
          redirectParam={redirectParam}
        />
      )}
    </AuthOverlay>
  );
}
