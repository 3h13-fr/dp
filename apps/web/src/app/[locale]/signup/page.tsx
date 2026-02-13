'use client';

import { useEffect } from 'react';
import { useAuthModal } from '@/contexts/AuthModalContext';

export default function SignupPage() {
  const { openSignup } = useAuthModal();

  useEffect(() => {
    openSignup();
  }, [openSignup]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-sm flex-col justify-center px-4 text-center text-neutral-500">
      <p>Opening sign up…</p>
      <button
        type="button"
        onClick={openSignup}
        className="mt-4 text-sm font-medium text-neutral-800 underline"
      >
        Click here to create an account
      </button>
    </div>
  );
}
