'use client';

import { useState, useEffect } from 'react';

type MapFullscreenButtonProps = {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
  /** Toujours afficher le bouton (ex. pour mode "expand" sans API Fullscreen) */
  alwaysShow?: boolean;
};

export function MapFullscreenButton({
  isFullscreen,
  onToggle,
  className = '',
  alwaysShow = false,
}: MapFullscreenButtonProps) {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      typeof document !== 'undefined' &&
        (document.fullscreenEnabled ||
          (document as any).webkitFullscreenEnabled ||
          (document as any).mozFullScreenEnabled ||
          (document as any).msFullscreenEnabled)
    );
  }, []);

  if (!isSupported && !alwaysShow) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors ${className}`}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <svg
          className="w-5 h-5 text-gray-700"
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
      ) : (
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      )}
    </button>
  );
}
