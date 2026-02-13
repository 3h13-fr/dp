'use client';

import { useEffect } from 'react';
import { FiltersContent } from './FiltersContent';

type FiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  listingType: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
};

export function FiltersSheet({ open, onClose, listingType }: FiltersSheetProps) {
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
        className="fixed inset-0 z-[55] bg-black/40 transition-opacity md:hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-ds-card border-t border-[var(--color-gray-light)] bg-[var(--color-white)] shadow-ds-dropdown transition-transform duration-300 ease-out md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
      >
        {/* Drag handle + close button */}
        <div className="relative flex justify-center py-3">
          <span className="h-1 w-12 rounded-ds-pill bg-ds-gray-light" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 safe-area-pb">
          <FiltersContent listingType={listingType} onApply={onClose} />
        </div>
      </div>
    </>
  );
}
