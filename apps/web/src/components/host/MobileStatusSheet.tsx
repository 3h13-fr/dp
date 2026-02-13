'use client';

import { useState, useEffect } from 'react';
import { ListingCompletionIndicator } from './ListingCompletionIndicator';
import { ConfirmDisableDialog } from './ConfirmDisableDialog';

type CompletionCheck = {
  id: string;
  label: string;
  completed: boolean;
};

type MobileStatusSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    status: string;
    displayTitle?: string | null;
    displayName?: string | null;
    title?: string | null;
  };
  completionChecks: CompletionCheck[];
  completionPercentage: number;
  canActivate: boolean;
  onToggleStatus: () => void;
  listingTitle: string;
};

/**
 * Bottom sheet for mobile showing detailed status and completion
 * Opens when user taps on the status bar
 */
export function MobileStatusSheet({
  isOpen,
  onClose,
  listing,
  completionChecks,
  completionPercentage,
  canActivate,
  onToggleStatus,
  listingTitle,
}: MobileStatusSheetProps) {
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggleClick = () => {
    if (listing.status === 'ACTIVE') {
      setShowDisableConfirm(true);
    } else {
      if (canActivate) {
        onToggleStatus();
        onClose();
      }
    }
  };

  const handleConfirmDisable = () => {
    setShowDisableConfirm(false);
    onToggleStatus();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl z-[60] lg:hidden max-h-[80vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">État de l&apos;annonce</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Fermer"
            >
              <svg
                className="h-5 w-5 text-neutral-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Listing Title */}
          <div className="mb-4">
            <p className="text-sm text-neutral-600 mb-1">Annonce</p>
            <p className="text-base font-semibold text-black">{listingTitle}</p>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <p className="text-sm text-neutral-600 mb-2">Statut</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                listing.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : listing.status === 'DRAFT'
                  ? 'bg-gray-100 text-gray-800'
                  : listing.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {listing.status === 'DRAFT' ? 'Brouillon' : listing.status}
            </span>
          </div>

          {/* Completion Indicator */}
          <div className="mb-6">
            <ListingCompletionIndicator
              checks={completionChecks}
              canActivate={canActivate}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {listing.status === 'ACTIVE' ? (
              <button
                type="button"
                onClick={handleToggleClick}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors"
              >
                Désactiver l&apos;annonce
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleClick}
                disabled={!canActivate}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canActivate ? 'Complétez tous les champs requis pour activer l\'annonce' : ''}
              >
                Activer l&apos;annonce
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDisableDialog
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        onConfirm={handleConfirmDisable}
        listingTitle={listingTitle}
      />
    </>
  );
}
