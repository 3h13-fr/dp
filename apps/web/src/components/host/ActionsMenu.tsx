'use client';

import { useState, useRef, useEffect } from 'react';

type ActionsMenuProps = {
  listing: {
    status: string;
    id: string;
  };
  canActivate: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onViewListing?: () => void;
};

/**
 * Dropdown menu (⋮) for listing actions
 * Contains activate/deactivate and view listing options
 */
export function ActionsMenu({
  listing,
  canActivate,
  onActivate,
  onDeactivate,
  onViewListing,
}: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleActivate = () => {
    setIsOpen(false);
    onActivate();
  };

  const handleDeactivate = () => {
    setIsOpen(false);
    onDeactivate();
  };

  const isActive = listing.status === 'ACTIVE';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="Menu d'actions"
        aria-expanded={isOpen}
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
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[200px]">
          {onViewListing && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewListing();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors first:rounded-t-lg"
            >
              Voir l&apos;annonce
            </button>
          )}
          {isActive ? (
            <button
              type="button"
              onClick={handleDeactivate}
              className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors last:rounded-b-lg"
            >
              Désactiver l&apos;annonce
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActivate}
              disabled={!canActivate}
              className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed last:rounded-b-lg"
              title={!canActivate ? 'Complétez tous les champs requis pour activer l\'annonce' : ''}
            >
              Activer l&apos;annonce
            </button>
          )}
        </div>
      )}
    </div>
  );
}
