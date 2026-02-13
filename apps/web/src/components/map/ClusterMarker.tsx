'use client';

import { Marker, MarkerEvent } from 'react-map-gl';
import { useCallback } from 'react';
import { clsx } from 'clsx';

type ClusterMarkerProps = {
  longitude: number;
  latitude: number;
  pointCount: number;
  onClick?: () => void;
  isSelected?: boolean;
};

export function ClusterMarker({
  longitude,
  latitude,
  pointCount,
  onClick,
  isSelected = false,
}: ClusterMarkerProps) {
  const handleClick = useCallback(
    (e: MarkerEvent) => {
      e.originalEvent?.stopPropagation();
      onClick?.();
    },
    [onClick],
  );

  // Déterminer la taille du cluster selon le nombre de points
  const size = pointCount < 10 ? 'small' : pointCount < 100 ? 'medium' : 'large';
  const sizeClasses = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base',
  };

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={handleClick}
    >
      <div
        className={clsx(
          'flex items-center justify-center rounded-full font-semibold text-white',
          'shadow-lg border-2 cursor-pointer transition-all duration-200',
          sizeClasses[size],
          {
            'bg-[#ff385c] border-[#ff385c] scale-110 shadow-xl': isSelected,
            'bg-blue-600 border-blue-700 hover:bg-blue-700 hover:scale-105': !isSelected,
          },
        )}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {pointCount}
      </div>
    </Marker>
  );
}
