'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getListingTitle } from '@/lib/listings';
import { S3Image } from '@/components/S3Image';
import { BookingStatusBadge } from './BookingStatusBadge';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingSummaryCardProps {
  booking: {
    id: string;
    status: BookingStatus;
    startAt: string;
    endAt: string;
    totalAmount: string | number;
    currency: string;
    listing: {
      id: string;
      slug?: string;
      title?: string | null;
      displayName?: string | null;
      type: string;
      photos?: Array<{ url: string; order?: number }>;
      city?: string | null;
      country?: string | null;
      address?: string | null;
    };
  };
}

export function BookingSummaryCard({ booking }: BookingSummaryCardProps) {
  const locale = useLocale();
  const photo = booking.listing.photos?.[0] ?? booking.listing.photos?.find((p) => p.order === 0);
  
  const getListingPath = () => {
    const vertical = booking.listing.type === 'CAR_RENTAL' 
      ? 'location' 
      : booking.listing.type === 'MOTORIZED_EXPERIENCE' 
      ? 'experience' 
      : 'ride';
    return `/${locale}/${vertical}/${booking.listing.slug ?? booking.listing.id}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLocation = () => {
    if (booking.listing.address) return booking.listing.address;
    const parts = [booking.listing.city, booking.listing.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const totalAmount = typeof booking.totalAmount === 'string' 
    ? parseFloat(booking.totalAmount) 
    : booking.totalAmount;

  return (
    <Link
      href={getListingPath()}
      className="block overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-4 p-4">
        {photo?.url ? (
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            <S3Image
              src={photo.url}
              alt={getListingTitle(booking.listing)}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-24 w-24 shrink-0 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="font-semibold leading-tight">{getListingTitle(booking.listing)}</h2>
            <BookingStatusBadge status={booking.status} />
          </div>
          {getLocation() && (
            <p className="mb-1 text-sm text-muted-foreground">
              📍 {getLocation()}
            </p>
          )}
          <p className="mb-1 text-sm text-muted-foreground">
            🕒 {formatDate(booking.startAt)} {formatTime(booking.startAt)} – {formatDate(booking.endAt)} {formatTime(booking.endAt)}
          </p>
          <p className="text-lg font-semibold">
            💰 {totalAmount.toFixed(2)} {booking.currency}
          </p>
        </div>
      </div>
    </Link>
  );
}
