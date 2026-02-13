'use client';

import { useEffect, useState } from 'react';
import { getPresignedImageUrl } from '@/lib/api';

interface S3ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

/**
 * Image component that automatically handles S3 presigned URLs for private buckets
 * Falls back to the original URL if presigning fails or is not needed
 */
export function S3Image({ src, fallbackSrc, ...props }: S3ImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the URL looks like an S3 URL
    const isS3Url = src && (
      src.includes('s3.amazonaws.com') ||
      src.includes('s3-') ||
      src.includes('/listings/') ||
      src.includes('/kyc/') ||
      src.includes('/incidents/') ||
      src.includes('/messages/') ||
      src.includes('/categories/')
    );

    if (!isS3Url || !src) {
      setImageSrc(src || fallbackSrc || '');
      setIsLoading(false);
      return;
    }

    // Try to get presigned URL
    getPresignedImageUrl(src)
      .then((presignedUrl) => {
        if (presignedUrl) {
          setImageSrc(presignedUrl);
        } else {
          // Fallback to original URL if presigning fails
          setImageSrc(src);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error getting presigned URL:', error);
        setImageSrc(fallbackSrc || src);
        setIsLoading(false);
      });
  }, [src, fallbackSrc]);

  // Show a placeholder while loading or if no src
  if (isLoading && !imageSrc) {
    return (
      <div
        {...(props as any)}
        className={`bg-muted animate-pulse ${props.className || ''}`}
        style={{ ...props.style, display: 'block' }}
      />
    );
  }

  return (
    <img
      {...props}
      src={imageSrc}
      onError={(e) => {
        // If presigned URL fails, try fallback or original
        if (imageSrc !== src && imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc || src);
        } else if (props.onError) {
          props.onError(e);
        }
      }}
    />
  );
}
