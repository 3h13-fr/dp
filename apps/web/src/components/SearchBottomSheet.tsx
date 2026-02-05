'use client';

import { useEffect } from 'react';

type SearchBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function SearchBottomSheet({ open, onClose, children }: SearchBottomSheetProps) {
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
        className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-ds-card border-t border-[var(--color-gray-light)] bg-[var(--color-white)] shadow-ds-dropdown transition-transform duration-300 ease-out md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <span className="h-1 w-12 rounded-ds-pill bg-ds-gray-light" aria-hidden />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 safe-area-pb">
          {children}
        </div>
      </div>
    </>
  );
}
