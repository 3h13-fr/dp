'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ConfirmDisableDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  listingTitle: string;
};

export function ConfirmDisableDialog({ isOpen, onClose, onConfirm, listingTitle }: ConfirmDisableDialogProps) {
  const t = useTranslations('hostNav');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {t('confirmDisableTitle') || 'Désactiver l\'annonce'}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('confirmDisableMessage') || `Êtes-vous sûr de vouloir désactiver l'annonce "${listingTitle}" ? Elle ne sera plus visible par les utilisateurs.`}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
          >
            {t('cancel') || 'Annuler'}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            {t('confirmDisable') || 'Désactiver'}
          </button>
        </div>
      </div>
    </div>
  );
}
