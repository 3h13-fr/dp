'use client';

import { useMemo, useCallback, forwardRef, useEffect, useState } from 'react';
import Map, { MapRef, ViewState, ViewStateChangeEvent } from 'react-map-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set. Mapbox maps will not work.');
}

export type MapboxMapProps = {
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  onMove?: (evt: ViewStateChangeEvent) => void;
  onMoveEnd?: (evt: ViewStateChangeEvent) => void;
  onClick?: (evt: any) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const MapboxMap = forwardRef<MapRef, MapboxMapProps>(function MapboxMap(
  {
    center = [2.3522, 48.8566], // Paris par défaut
    zoom = 10,
    onMove,
    onMoveEnd,
    onClick,
    children,
    className = '',
    style,
  },
  ref,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialViewState = useMemo<ViewState>(
    () => ({
      longitude: center[0],
      latitude: center[1],
      zoom,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    }),
    [center, zoom],
  );

  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      onMove?.(evt);
    },
    [onMove],
  );

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      onMoveEnd?.(evt);
    },
    [onMoveEnd],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={style}>
        <p className="text-sm text-muted-foreground">Mapbox token not configured</p>
      </div>
    );
  }

  // Ne pas rendre la carte côté serveur
  if (!mounted) {
    return (
      <div 
        className={`w-full h-full ${className}`} 
        style={{ 
          ...style, 
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '300px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
      </div>
    );
  }

  console.log('[MapboxMap] Rendering map with token:', MAPBOX_TOKEN ? `Present (${MAPBOX_TOKEN.substring(0, 20)}...)` : 'Missing');
  console.log('[MapboxMap] Initial view state:', initialViewState);

  return (
    <div 
      id="mapbox-container"
      className={`w-full h-full ${className}`} 
      style={{ 
        ...style, 
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '300px',
        overflow: 'hidden'
      }}
    >
      <Map
        ref={ref}
        mapboxAccessToken={MAPBOX_TOKEN || ''}
        initialViewState={initialViewState}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onClick={onClick}
        style={{ width: '100%', height: '100%', display: 'block' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        onLoad={() => console.log('[MapboxMap] Map loaded successfully')}
        onError={(e) => console.error('[MapboxMap] Map error:', e)}
      >
        {children}
      </Map>
    </div>
  );
});
