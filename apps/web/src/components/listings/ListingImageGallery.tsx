'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';
import { createPortal } from 'react-dom';

type Photo = {
  url: string;
  order?: number;
};

type ListingImageGalleryProps = {
  photos: Photo[];
  alt: string;
};

export function ListingImageGallery({ photos, alt }: ListingImageGalleryProps) {
  const t = useTranslations('listing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort photos by order
  const sortedPhotos = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasMultiplePhotos = sortedPhotos.length > 1;

  // Handle swipe on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < sortedPhotos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    touchStartX.current = null;
  };

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < sortedPhotos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentIndex, sortedPhotos.length]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const goToNext = () => {
    if (currentIndex < sortedPhotos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  if (sortedPhotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--color-gray-bg)] text-[var(--color-gray)]">
        {t('noImage')}
      </div>
    );
  }

  // Mobile: Swipeable gallery
  const mobileGallery = (
    <div className="relative w-full md:hidden">
      <div
        ref={scrollContainerRef}
        className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-gray-bg)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={openFullscreen}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {sortedPhotos.map((photo, index) => (
            <div key={index} className="h-full w-full shrink-0">
              <S3Image
                src={photo.url}
                alt={`${alt} - ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        {hasMultiplePhotos && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {sortedPhotos.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                }`}
                aria-label={`Image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* See all photos indicator */}
        {hasMultiplePhotos && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openFullscreen();
            }}
            className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/70"
          >
            {t('seeAllPhotos')}
          </button>
        )}
      </div>
    </div>
  );

  // Desktop: Hero/Column layout (60/40)
  const desktopGallery = (
    <div className="hidden md:block">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex gap-2 h-[500px] md:h-[600px]">
          {/* Grande image hero (60%) */}
          <div className="flex-[0_0_60%] relative overflow-hidden rounded-l-2xl bg-[var(--color-gray-bg)]">
            <S3Image
              src={sortedPhotos[currentIndex]?.url || sortedPhotos[0]?.url}
              alt={alt}
              className="h-full w-full object-cover cursor-pointer"
              onClick={openFullscreen}
            />
            {hasMultiplePhotos && (
              <>
                {/* Navigation arrows */}
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevious();
                    }}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-gray-dark)] shadow-lg backdrop-blur-sm hover:bg-white transition-colors"
                    aria-label="Image précédente"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentIndex < sortedPhotos.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-gray-dark)] shadow-lg backdrop-blur-sm hover:bg-white transition-colors"
                    aria-label="Image suivante"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Colonne thumbnails (40%) - seulement si 3+ photos */}
          {sortedPhotos.length >= 3 && (
            <div className="flex-[0_0_40%] flex flex-col gap-2">
              {sortedPhotos.slice(1, 3).map((photo, index) => {
                const photoIndex = index + 1;
                const isLast = index === 1; // Dernière de la colonne
                const hasMore = sortedPhotos.length > 3;
                const moreCount = sortedPhotos.length - 3;

                return (
                  <div
                    key={photoIndex}
                    className={`relative flex-1 overflow-hidden bg-[var(--color-gray-bg)] ${
                      index === 0 ? 'rounded-tr-2xl' : 'rounded-br-2xl'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex(photoIndex);
                      }}
                      className="relative h-full w-full"
                    >
                      <S3Image
                        src={photo.url}
                        alt={`${alt} - ${photoIndex + 1}`}
                        className="h-full w-full object-cover transition-opacity hover:opacity-90"
                      />
                      {/* Indicateur "+X photos" sur la dernière thumbnail */}
                      {isLast && hasMore && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen();
                          }}
                        >
                          <div className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[var(--color-black)]">
                            {moreCount === 1
                              ? t('morePhotos', { count: moreCount })
                              : t('morePhotosPlural', { count: moreCount })}
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Fullscreen modal
  const fullscreenModal = isFullscreen && mounted && createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={closeFullscreen}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={closeFullscreen}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
        aria-label={t('closeGallery')}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
        <S3Image
          src={sortedPhotos[currentIndex]?.url || sortedPhotos[0]?.url}
          alt={alt}
          className="h-full w-full object-contain"
        />

        {/* Navigation */}
        {hasMultiplePhotos && (
          <>
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label="Image précédente"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentIndex < sortedPhotos.length - 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label="Image suivante"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Pagination dots */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {sortedPhotos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                  }`}
                  aria-label={`Image ${index + 1}`}
                />
              ))}
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              {currentIndex + 1} / {sortedPhotos.length}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {mobileGallery}
      {desktopGallery}
      {fullscreenModal}
    </>
  );
}
