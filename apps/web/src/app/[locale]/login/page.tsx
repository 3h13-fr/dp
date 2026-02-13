'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const showDemoLogin = searchParams.get('demo') === '1';
  const { openLogin } = useAuthModal();

  const handleForgotPassword = useCallback(() => {
    router.push(`/${locale}/forgot-password`);
  }, [router, locale]);

  // When not in demo mode, open the auth popup on mount (pass redirect for checkout etc.)
  useEffect(() => {
    if (!showDemoLogin) {
      openLogin(redirectParam ?? undefined);
    }
  }, [showDemoLogin, openLogin, redirectParam]);

  // Demo mode (E2E): render full-page form so tests can fill and submit
  if (showDemoLogin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
        <LoginForm
          showDemoLogin
          redirectParam={redirectParam}
          onForgotPassword={handleForgotPassword}
        />
      </div>
    );
  }

  // Brief fallback while effect runs (user may see this only if they navigate away before redirect)
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-sm flex-col justify-center px-4 text-center text-neutral-500">
      <p>Opening login…</p>
      <button
        type="button"
        onClick={() => openLogin(redirectParam ?? undefined)}
        className="mt-4 text-sm font-medium text-neutral-800 underline"
      >
        Click here to log in
      </button>
    </div>
  );
}
