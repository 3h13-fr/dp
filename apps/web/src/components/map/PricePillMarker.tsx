'use client';

import { Marker, MarkerEvent } from 'react-map-gl';
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';

type PricePillMarkerProps = {
  longitude: number;
  latitude: number;
  price: number;
  currency?: string;
  onClick?: () => void;
  isSelected?: boolean;
  isHoveredByList?: boolean;
  onHover?: (hovered: boolean) => void;
};

export function PricePillMarker({
  longitude,
  latitude,
  price,
  currency = 'EUR',
  onClick,
  isSelected = false,
  isHoveredByList = false,
  onHover,
}: PricePillMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const effectiveHovered = isHovered || isHoveredByList;

  const handleClick = useCallback(
    (e: MarkerEvent) => {
      e.originalEvent?.stopPropagation();
      onClick?.();
    },
    [onClick],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  // Formater le prix (arrondir à l'entier)
  const formattedPrice = Math.round(price);
  const displayPrice = `${formattedPrice} ${currency}`;

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClick={handleClick}
    >
      <div
        className={clsx(
          'cursor-pointer select-none transition-all duration-200',
          'px-3 py-1.5 rounded-full font-semibold text-sm',
          'shadow-lg border-2',
          {
            // État normal
            'bg-white text-black border-black/20': !isSelected && !effectiveHovered,
            // État hovered (desktop ou liste)
            'bg-black text-white border-black scale-110': !isSelected && effectiveHovered,
            // État selected
            'bg-[#ff385c] text-white border-[#ff385c] scale-110 shadow-xl': isSelected,
          },
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          whiteSpace: 'nowrap',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {displayPrice}
      </div>
    </Marker>
  );
}
