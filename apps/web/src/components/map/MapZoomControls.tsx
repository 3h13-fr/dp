'use client';

import { useCallback } from 'react';
import { MapRef } from 'react-map-gl';

type MapZoomControlsProps = {
  mapRef: React.RefObject<MapRef>;
  className?: string;
};

export function MapZoomControls({ mapRef, className = '' }: MapZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, [mapRef]);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, [mapRef]);

  return (
    <div className={`absolute top-4 left-4 z-10 flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleZoomIn}
        className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Zoom in"
      >
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Zoom out"
      >
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
            d="M20 12H4"
          />
        </svg>
      </button>
    </div>
  );
}
