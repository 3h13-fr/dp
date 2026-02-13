'use client';

import { Marker, MarkerEvent } from 'react-map-gl';
import { useCallback } from 'react';

type MapboxMarkerProps = {
  longitude: number;
  latitude: number;
  onClick?: () => void;
  children?: React.ReactNode;
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

export function MapboxMarker({
  longitude,
  latitude,
  onClick,
  children,
  anchor = 'bottom',
}: MapboxMarkerProps) {
  const handleClick = useCallback(
    (e: MarkerEvent) => {
      e.originalEvent?.stopPropagation();
      onClick?.();
    },
    [onClick],
  );

  return (
    <Marker longitude={longitude} latitude={latitude} anchor={anchor} onClick={handleClick}>
      {children || (
        <div className="cursor-pointer">
          <svg
            width="32"
            height="40"
            viewBox="0 0 32 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 0C7.163 0 0 7.163 0 16c0 11.045 16 24 16 24s16-12.955 16-24c0-8.837-7.163-16-16-16z"
              fill="#ff385c"
            />
            <circle cx="16" cy="16" r="6" fill="white" />
          </svg>
        </div>
      )}
    </Marker>
  );
}
