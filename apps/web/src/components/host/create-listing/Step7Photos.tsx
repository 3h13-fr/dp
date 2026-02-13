'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { S3Image } from '@/components/S3Image';

type Photo = {
  id: string;
  url: string;
  order: number;
};

type Step7PhotosProps = {
  listingId: string;
  onComplete: () => void;
  onBack: () => void;
  apiBasePath?: string; // Optional API base path, defaults to '/listings'
};

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

export function Step7Photos({ listingId, onComplete, onBack, apiBasePath = '/listings' }: Step7PhotosProps) {
  const t = useTranslations('createListing');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Load existing photos
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const res = await apiFetch(`${apiBasePath}/${listingId}`);
        if (res.ok) {
          const data = await res.json();
          setPhotos((data.photos || []).map((p: { id: string; url: string; order: number }) => ({ id: p.id, url: p.url, order: p.order ?? 0 })));
        }
      } catch (err) {
        console.error('Failed to load photos:', err);
      }
    };
    loadPhotos();
  }, [listingId, apiBasePath]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const remainingSlots = MAX_PHOTOS - photos.length;
      if (fileArray.length > remainingSlots) {
        setError(t('maxPhotosReached') || `Maximum ${MAX_PHOTOS} photos autorisées`);
        return;
      }

      setUploading(true);
      setError('');
      setUploadProgress({});

      try {
        const startOrder = photos.length;
        const uploadPromises = fileArray.map(async (file, index) => {
          const fileId = `${file.name}-${Date.now()}-${index}`;
          
          // Simulate progress for better UX
          setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));
          
          // Get presigned URL
          const presignRes = await apiFetch('/uploads/presign', {
            method: 'POST',
            body: JSON.stringify({
              purpose: 'listing_photo',
              contentType: file.type || 'image/jpeg',
              filename: file.name,
            }),
          });

          if (!presignRes.ok) {
            throw new Error('Failed to get presigned URL');
          }

          setUploadProgress((prev) => ({ ...prev, [fileId]: 30 }));

          const { uploadUrl, publicUrl } = await presignRes.json();

          if (!uploadUrl) {
            throw new Error('Upload not configured');
          }

          // Upload to S3
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'image/jpeg',
            },
          });

          if (!uploadRes.ok) {
            throw new Error('Failed to upload to S3');
          }

          setUploadProgress((prev) => ({ ...prev, [fileId]: 70 }));

          // Add photo to listing with correct order
          const addPhotoRes = await apiFetch(`${apiBasePath}/${listingId}/photos`, {
            method: 'POST',
            body: JSON.stringify({
              url: publicUrl,
              order: startOrder + index,
            }),
          });

          if (!addPhotoRes.ok) {
            throw new Error('Failed to add photo to listing');
          }

          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

          const photoData = await addPhotoRes.json();
          return { id: photoData.id, url: publicUrl, order: startOrder + index };
        });

        const newPhotos = await Promise.all(uploadPromises);
        setPhotos((prev) => [...prev, ...newPhotos].sort((a, b) => a.order - b.order));
        setUploadProgress({});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUploadProgress({});
      } finally {
        setUploading(false);
      }
    },
    [listingId, photos.length, t, apiBasePath],
  );

  const handleRemovePhoto = useCallback(
    async (photoId: string) => {
      try {
        const res = await apiFetch(`${apiBasePath}/${listingId}/photos/${photoId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to remove photo');
        }

        const filtered = photos.filter((p) => p.id !== photoId);
        // Reorder remaining photos on backend
        if (filtered.length > 0) {
          const photoIds = filtered.map((p) => p.id);
          await apiFetch(`${apiBasePath}/${listingId}/photos/reorder`, {
            method: 'PATCH',
            body: JSON.stringify({ photoIds }),
          });
        }
        setPhotos(filtered.map((p, idx) => ({ ...p, order: idx })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    },
    [listingId, photos, t, apiBasePath],
  );

  const handleReorder = useCallback(
    async (newOrder: Photo[]) => {
      const photoIds = newOrder.map((p) => p.id);
      try {
        const res = await apiFetch(`${apiBasePath}/${listingId}/photos/reorder`, {
          method: 'PATCH',
          body: JSON.stringify({ photoIds }),
        });

        if (!res.ok) {
          throw new Error('Failed to reorder photos');
        }

        setPhotos(newOrder.map((p, idx) => ({ ...p, order: idx })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    },
    [listingId, t, apiBasePath],
  );

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDragOverIndex(index);

    if (draggedIndex !== index) {
      const newPhotos = [...photos];
      const draggedPhoto = newPhotos[draggedIndex];
      newPhotos.splice(draggedIndex, 1);
      newPhotos.splice(index, 0, draggedPhoto);
      setPhotos(newPhotos);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      const newOrder = photos.map((p, idx) => ({ ...p, order: idx }));
      handleReorder(newOrder);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPhotos = [...photos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
    handleReorder(newPhotos);
  };

  const handleMoveDown = (index: number) => {
    if (index === photos.length - 1) return;
    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
    handleReorder(newPhotos);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      // Reset drag state
    }
  };

  const canAddMore = photos.length < MAX_PHOTOS;
  const canProceed = photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS;
  const needsMorePhotos = photos.length < MIN_PHOTOS;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('step7Title')}</h2>
      <p className="text-sm text-muted-foreground">{t('step7Desc')}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Compteur de photos */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2">
        <span className="text-sm font-medium">
          {photos.length} / {MAX_PHOTOS} {t('photos') || 'photos'}
        </span>
        {needsMorePhotos && (
          <span className="text-sm text-amber-600 font-medium">
            {t('minPhotosRequired') || `Minimum ${MIN_PHOTOS} photos requises`} ({MIN_PHOTOS - photos.length} {t('remaining') || 'restantes'})
          </span>
        )}
        {canProceed && !needsMorePhotos && (
          <span className="text-sm text-green-600 font-medium">
            ✓ {t('photosValid') || 'Photos valides'}
          </span>
        )}
      </div>

      {/* Upload area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
            dragCounterRef.current > 0
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
              : 'border-border hover:border-primary hover:bg-muted/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-muted-foreground font-medium">{t('dragDropPhotos') || 'Glissez-déposez vos photos ici'}</p>
            <p className="text-sm text-muted-foreground">{t('uploadPhotos') || 'ou cliquez pour sélectionner'}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('photoRequirements') || `Minimum ${MIN_PHOTOS}, maximum ${MAX_PHOTOS} photos`}
            </p>
          </div>
        </div>
      )}

      {!canAddMore && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800 font-medium">{t('maxPhotosReached') || `Maximum ${MAX_PHOTOS} photos atteint`}</p>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(e, index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  const newPhotos = [...photos];
                  const draggedPhoto = newPhotos[draggedIndex];
                  newPhotos.splice(draggedIndex, 1);
                  newPhotos.splice(index, 0, draggedPhoto);
                  handleReorder(newPhotos.map((p, idx) => ({ ...p, order: idx })));
                  setDraggedIndex(null);
                }
              }}
              onDragEnd={handleDragEnd}
              className={`relative group cursor-move transition-all ${
                draggedIndex === index 
                  ? 'opacity-50 scale-95 z-50' 
                  : dragOverIndex === index 
                    ? 'ring-2 ring-primary ring-offset-2 scale-105 z-40'
                    : ''
              }`}
            >
              <S3Image
                src={photo.url}
                alt={`Photo ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border-2 border-border transition-all"
              />
              {/* Drag handle indicator */}
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                {t('drag') || 'Déplacer'}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  {t('removePhoto') || 'Supprimer'}
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    className="opacity-0 group-hover:opacity-100 bg-white text-black px-2 py-1 rounded text-sm hover:bg-gray-100"
                    title={t('moveUp') || 'Déplacer vers le haut'}
                  >
                    ↑
                  </button>
                )}
                {index < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    className="opacity-0 group-hover:opacity-100 bg-white text-black px-2 py-1 rounded text-sm hover:bg-gray-100"
                    title={t('moveDown') || 'Déplacer vers le bas'}
                  >
                    ↓
                  </button>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t('photoUploading') || 'Téléchargement en cours...'}</p>
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-1">
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {needsMorePhotos && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            {t('minPhotosWarning') || `Veuillez ajouter au moins ${MIN_PHOTOS} photos avant de continuer.`}
          </p>
        </div>
      )}
    </div>
  );
}
