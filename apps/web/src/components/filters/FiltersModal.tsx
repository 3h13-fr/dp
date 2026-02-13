'use client';

import { useEffect, useRef } from 'react';
import { FiltersContent } from './FiltersContent';

type FiltersModalProps = {
  open: boolean;
  onClose: () => void;
  listingType: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
  buttonRef?: React.RefObject<HTMLButtonElement>;
};

export function FiltersModal({ open, onClose, listingType, buttonRef }: FiltersModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Positionner le modal près du bouton
  useEffect(() => {
    if (!open || !buttonRef?.current || !modalRef.current) return;

    const updatePosition = () => {
      if (!buttonRef?.current || !modalRef.current) return;
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      
      // Positionner le modal en dessous du bouton, aligné à droite
      modal.style.top = `${buttonRect.bottom + window.scrollY + 8}px`;
      modal.style.right = `${window.innerWidth - buttonRect.right}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, buttonRef]);

  // Fermer au clic en dehors
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (buttonRef?.current && !buttonRef.current.contains(event.target as Node)) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, buttonRef]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity md:block hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed z-50 hidden md:block w-96 max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
      >
        <div className="p-6">
          <FiltersContent listingType={listingType} onApply={onClose} />
        </div>
      </div>
    </>
  );
}
