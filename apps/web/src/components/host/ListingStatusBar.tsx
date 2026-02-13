'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ActionsMenu } from './ActionsMenu';
import { MobileStatusSheet } from './MobileStatusSheet';

type CompletionCheck = {
  id: string;
  label: string;
  completed: boolean;
};

type ListingStatusBarProps = {
  listing: {
    id: string;
    status: string;
    displayTitle?: string | null;
    displayName?: string | null;
    title?: string | null;
  };
  listingTitle: string;
  publicUrl: string;
  completionPercentage: number;
  completionChecks: CompletionCheck[];
  canActivate: boolean;
  onToggleStatus: () => void;
  onShowDisableConfirm: () => void;
};

/**
 * Compact status bar for listing edit page
 * Desktop: horizontal layout with name, badge, progress bar, button, menu
 * Mobile: vertical compact layout with tap → bottom sheet
 */
export function ListingStatusBar({
  listing,
  listingTitle,
  publicUrl,
  completionPercentage,
  completionChecks,
  canActivate,
  onToggleStatus,
  onShowDisableConfirm,
}: ListingStatusBarProps) {
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  const handleActivate = () => {
    if (canActivate) {
      onToggleStatus();
    }
  };

  const handleDeactivate = () => {
    onShowDisableConfirm();
  };

  const statusLabel =
    listing.status === 'DRAFT'
      ? 'Brouillon'
      : listing.status === 'PENDING'
      ? 'En attente'
      : listing.status === 'ACTIVE'
      ? 'Active'
      : listing.status;

  const statusBadgeClass =
    listing.status === 'ACTIVE'
      ? 'bg-green-100 text-green-800'
      : listing.status === 'DRAFT'
      ? 'bg-gray-100 text-gray-800'
      : listing.status === 'PENDING'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <>
      {/* Desktop Status Bar */}
      <div className="hidden lg:flex items-center justify-between h-[64px] px-4 border-b border-neutral-200 bg-white">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h2 className="text-base font-semibold text-black truncate">{listingTitle}</h2>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shrink-0 ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completionPercentage === 100
                    ? 'bg-green-500'
                    : completionPercentage >= 80
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-xs text-neutral-600 shrink-0">{completionPercentage}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Voir
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
          <ActionsMenu
            listing={listing}
            canActivate={canActivate}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onViewListing={() => window.open(publicUrl, '_blank')}
          />
        </div>
      </div>

      {/* Mobile Status Bar */}
      <div
        className="lg:hidden px-4 py-3 border-b border-neutral-200 bg-white cursor-pointer active:bg-neutral-50 transition-colors min-h-[48px] max-h-[56px]"
        onClick={() => setShowMobileSheet(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-black truncate flex-1 mr-2">
            {listingTitle}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercentage === 100
                  ? 'bg-green-500'
                  : completionPercentage >= 80
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="text-xs text-neutral-600 shrink-0">{completionPercentage}%</span>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <MobileStatusSheet
        isOpen={showMobileSheet}
        onClose={() => setShowMobileSheet(false)}
        listing={listing}
        completionChecks={completionChecks}
        completionPercentage={completionPercentage}
        canActivate={canActivate}
        onToggleStatus={onToggleStatus}
        listingTitle={listingTitle}
      />
    </>
  );
}
