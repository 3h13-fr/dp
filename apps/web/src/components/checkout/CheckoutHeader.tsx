'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

type CheckoutHeaderProps = {
  onClose?: () => void;
  showBack?: boolean;
};

export function CheckoutHeader({ onClose, showBack = true }: CheckoutHeaderProps) {
  const router = useRouter();
  const locale = useLocale();

  const handleBack = () => {
    router.back();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Default: navigate to home or listing page
      router.push(`/${locale}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-3 lg:hidden">
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-gray-bg)] transition-colors"
          aria-label="Retour"
        >
          <svg
            className="h-6 w-6 text-[var(--color-black)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {!showBack && <div />}
      <button
        type="button"
        onClick={handleClose}
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-gray-bg)] transition-colors"
        aria-label="Fermer"
      >
        <svg
          className="h-6 w-6 text-[var(--color-black)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>
  );
}
