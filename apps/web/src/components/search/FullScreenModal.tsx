'use client';

import { useEffect } from 'react';

type FullScreenModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function FullScreenModal({ open, onClose, title, children }: FullScreenModalProps) {
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-white md:hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-white md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-black"
            aria-label="Retour"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="flex-1 text-center text-base font-semibold text-black">{title}</h2>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
