'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

type SheetState = 'peek' | 'mid' | 'full';

type ListingsBottomSheetProps = {
  children: React.ReactNode;
  onStateChange?: (state: SheetState) => void;
  initialState?: SheetState;
  onMapInteractivityChange?: (isInteractive: boolean) => void;
};

const HEIGHT_PEEK = '22vh';
const HEIGHT_MID = '55vh';
const HEIGHT_FULL = '92vh';

export function ListingsBottomSheet({
  children,
  onStateChange,
  initialState = 'peek',
  onMapInteractivityChange,
}: ListingsBottomSheetProps) {
  const [state, setState] = useState<SheetState>(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Notifier le parent du changement d'état
  useEffect(() => {
    onStateChange?.(state);
    // La carte est interactive uniquement en peek
    onMapInteractivityChange?.(state === 'peek');
  }, [state, onStateChange, onMapInteractivityChange]);

  // Calculer la hauteur selon l'état
  const getHeight = useCallback((s: SheetState) => {
    switch (s) {
      case 'peek':
        return HEIGHT_PEEK;
      case 'mid':
        return HEIGHT_MID;
      case 'full':
        return HEIGHT_FULL;
    }
  }, []);

  // Trouver le snap point le plus proche
  const getNearestSnapPoint = useCallback((height: number): SheetState => {
    const viewportHeight = window.innerHeight;
    const peekHeight = (viewportHeight * 22) / 100;
    const midHeight = (viewportHeight * 55) / 100;
    const fullHeight = (viewportHeight * 92) / 100;

    const peekDiff = Math.abs(height - peekHeight);
    const midDiff = Math.abs(height - midHeight);
    const fullDiff = Math.abs(height - fullHeight);

    if (peekDiff <= midDiff && peekDiff <= fullDiff) return 'peek';
    if (midDiff <= fullDiff) return 'mid';
    return 'full';
  }, []);

  // Gérer le début du drag
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
      if (sheetRef.current) {
        const rect = sheetRef.current.getBoundingClientRect();
        setStartHeight(rect.height);
      }
      e.preventDefault();
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setStartY(e.clientY);
      if (sheetRef.current) {
        const rect = sheetRef.current.getBoundingClientRect();
        setStartHeight(rect.height);
      }
      e.preventDefault();
    },
    [],
  );

  // Gérer le mouvement pendant le drag
  const handleMove = useCallback(
    (currentY: number) => {
      if (!isDragging || !sheetRef.current) return;

      const deltaY = startY - currentY; // Positif = vers le haut
      const newHeight = Math.max(0, Math.min(window.innerHeight, startHeight + deltaY));
      const newState = getNearestSnapPoint(newHeight);

      // Mettre à jour visuellement pendant le drag
      if (sheetRef.current) {
        sheetRef.current.style.height = `${newHeight}px`;
      }
    },
    [isDragging, startY, startHeight, getNearestSnapPoint],
  );

  // Gérer la fin du drag
  const handleEnd = useCallback(() => {
    if (!isDragging || !sheetRef.current) return;

    const rect = sheetRef.current.getBoundingClientRect();
    const newState = getNearestSnapPoint(rect.height);
    setState(newState);

    // Réinitialiser la hauteur pour laisser CSS gérer la transition
    sheetRef.current.style.height = '';
    setIsDragging(false);
  }, [isDragging, getNearestSnapPoint]);

  // Écouter les événements globaux pour le drag
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientY);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Empêcher le scroll du body quand le sheet est ouvert
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Gérer le clic sur le drag handle pour changer d'état
  const handleDragHandleClick = useCallback(() => {
    const nextState: SheetState = state === 'peek' ? 'mid' : state === 'mid' ? 'full' : 'peek';
    setState(nextState);
  }, [state]);

  return (
    <>
      {/* Backdrop (optionnel, pour le mode full) */}
      {state === 'full' && (
        <div
          className="fixed inset-0 z-20 bg-black/20 transition-opacity"
          aria-hidden
          onClick={() => setState('peek')}
        />
      )}

      {/* Bottom Sheet - z-index réduit pour rester sous les formulaires */}
      <div
        ref={sheetRef}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-30',
          'flex flex-col',
          'bg-white rounded-t-3xl shadow-2xl',
          'transition-all duration-300 ease-out',
          {
            'rounded-t-3xl': state === 'peek' || state === 'mid',
            'rounded-t-none': state === 'full',
          },
        )}
        style={{
          height: getHeight(state),
          maxHeight: '92vh',
          touchAction: 'none',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Résultats de recherche"
      >
        {/* Drag Handle */}
        <div
          className="relative flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
          onClick={handleDragHandleClick}
        >
          <span
            className="h-1.5 w-12 rounded-full bg-gray-300"
            aria-hidden
          />
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
