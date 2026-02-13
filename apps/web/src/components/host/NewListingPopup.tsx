'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { NewListingForm } from './NewListingForm';

type NewListingPopupProps = {
  open: boolean;
  onClose: () => void;
};

export function NewListingPopup({ open, onClose }: NewListingPopupProps) {
  const router = useRouter();
  const locale = useLocale();
  const modalRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fermer au clic en dehors (desktop seulement, le mobile utilise le backdrop)
  // Désactivé pour éviter les fermetures accidentelles - le backdrop gère déjà la fermeture
  // useEffect(() => {
  //   if (!open) return;
  //   const handleClickOutside = (event: MouseEvent) => {
  //     // Vérifier que le clic est vraiment en dehors du popup desktop
  //     const target = event.target as Node;
  //     if (modalRef.current && !modalRef.current.contains(target)) {
  //       // Vérifier aussi que ce n'est pas un clic sur le backdrop ou le sheet mobile
  //       const backdrop = document.querySelector('.fixed.inset-0.z-\\[55\\]');
  //       if (backdrop && backdrop.contains(target)) {
  //         // Le backdrop a son propre handler, ne rien faire ici
  //         return;
  //       }
  //       if (mobileSheetRef.current && mobileSheetRef.current.contains(target)) {
  //         // C'est un clic dans le sheet mobile, ne pas fermer
  //         return;
  //       }
  //       // Seulement fermer si on est sur desktop et qu'on clique vraiment en dehors
  //       onClose();
  //     }
  //   };
  //   // Utiliser 'click' au lieu de 'mousedown' pour éviter les fermetures accidentelles
  //   document.addEventListener('click', handleClickOutside, true);
  //   return () => {
  //     document.removeEventListener('click', handleClickOutside, true);
  //   };
  // }, [open, onClose]);

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const handleSuccess = (listingId: string) => {
    onClose();
    router.push(`/${locale}/host/listings/${listingId}`);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/40 transition-opacity"
        aria-hidden
        onClick={(e) => {
          // Ne fermer que si on clique directement sur le backdrop, pas sur ses enfants
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />

      {/* Mobile Sheet */}
      <div
        ref={mobileSheetRef}
        className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[90vh] flex-col rounded-t-xl border-t border-neutral-200 bg-white shadow-xl transition-transform duration-300 ease-out md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Nouvelle annonce"
        onClick={(e) => {
          // Empêcher la propagation vers le backdrop
          e.stopPropagation();
        }}
      >
        {/* Drag handle + close button */}
        <div className="relative flex justify-center py-3">
          <span className="h-1 w-12 rounded-full bg-neutral-300" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <NewListingForm onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </div>

      {/* Desktop Popup */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 z-[60] hidden w-full max-w-4xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl md:flex md:flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Nouvelle annonce"
        onClick={(e) => {
          // Empêcher la propagation vers le backdrop
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-xl font-semibold">Nouvelle annonce</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <NewListingForm onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </div>
    </>
  );
}
