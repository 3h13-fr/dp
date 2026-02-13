'use client';

import { useEffect } from 'react';

type KycOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
};

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-3 top-3 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black"
      aria-label="Close"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export function KycOverlay({ open, onClose, children, 'aria-label': ariaLabel }: KycOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[var(--color-gray-light)] bg-[var(--color-white)] shadow-lg transition-transform duration-300 ease-out md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? 'KYC'}
      >
        <div className="relative flex justify-center py-3">
          <span className="h-1 w-12 rounded-full bg-neutral-200" aria-hidden />
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </div>
      <div
        className="fixed left-1/2 top-1/2 z-50 hidden max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl md:flex"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? 'KYC'}
      >
        <div className="relative shrink-0 py-2 pr-12">
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </>
  );
}
