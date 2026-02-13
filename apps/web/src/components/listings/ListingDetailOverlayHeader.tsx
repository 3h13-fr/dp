'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useState } from 'react';

type ListingDetailOverlayHeaderProps = {
  listingId: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
};

export function ListingDetailOverlayHeader({
  listingId,
  isFavorite = false,
  onFavoriteToggle,
}: ListingDetailOverlayHeaderProps) {
  const router = useRouter();
  const t = useTranslations('listing');
  const scrollDirection = useScrollDirection();
  const [isSharing, setIsSharing] = useState(false);

  // Show header when scrolling up or at top, hide when scrolling down
  const isVisible = scrollDirection !== 'down';

  const handleShare = async () => {
    const url = window.location.href;
    
    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setIsSharing(true);
      setTimeout(() => setIsSharing(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-opacity duration-300 md:hidden ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-[var(--color-gray-dark)] shadow-md hover:bg-white transition-colors"
        aria-label={t('back')}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Right side buttons */}
      <div className="flex items-center gap-2">
        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-[var(--color-gray-dark)] shadow-md hover:bg-white transition-colors ${
            isSharing ? 'bg-green-100' : ''
          }`}
          aria-label={t('share')}
        >
          {isSharing ? (
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>

        {/* Favorite button */}
        <button
          type="button"
          onClick={onFavoriteToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-[var(--color-gray-dark)] shadow-md hover:bg-white transition-colors"
          aria-label={t('favorite')}
        >
          <svg
            className={`h-5 w-5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'fill-none'
            }`}
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
