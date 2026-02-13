'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useKycModal } from '@/contexts/KycModalContext';
import { S3Image } from '@/components/S3Image';

type BookingItem = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: string;
  currency: string;
  listing: { 
    id: string; 
    title?: string | null; 
    displayName?: string | null;
    displayTitle?: string | null;
    type: string; 
    city?: string | null;
    country?: string | null;
    photos: { url: string }[] 
  };
  host: { firstName: string | null; lastName: string | null };
};

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BookingStatusBadge({ status, label }: { status: string; label: string }) {
  if (status === 'CANCELLED') {
    return (
      <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
        {label}
      </span>
    );
  }
  
  return null;
}

export default function MyBookingsPage() {
  const { ready } = useRequireAuth();
  const locale = useLocale();
  const t = useTranslations('kyc');
  const tNav = useTranslations('nav');
  const tBooking = useTranslations('booking');
  const tListing = useTranslations('listingCard');
  const { openKyc } = useKycModal();
  const [data, setData] = useState<{ items: BookingItem[]; total: number } | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    apiFetch('/bookings/my')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        setKycStatus(user?.kycStatus ?? null);
        setMeLoaded(true);
      })
      .catch(() => setMeLoaded(true));
  }, [ready]);

  if (!ready) return null;
  if (!data) return <p className="px-4 py-8 text-muted-foreground">{tBooking('common.loading')}</p>;

  const hostName = (host: { firstName: string | null; lastName: string | null }) => {
    const parts = [host.firstName, host.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '';
  };

  const locationString = (listing: BookingItem['listing']) => {
    const parts = [listing.city, listing.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      PENDING: tBooking('status.pending'),
      CONFIRMED: tBooking('status.confirmed'),
      CANCELLED: tBooking('status.cancelled'),
      PENDING_APPROVAL: tBooking('status.pending'),
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-3xl font-bold mb-6 text-black">{tNav('myBookings')}</h1>

        {meLoaded && kycStatus !== 'APPROVED' && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800">{t('afterFirstBooking')}</p>
            <button
              type="button"
              onClick={() => openKyc(true)}
              className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {t('goToKyc')}
            </button>
          </div>
        )}

        <div className="space-y-4">
          {data.items.map((b) => {
            const location = locationString(b.listing);
            const host = hostName(b.host);
            const statusLabel = getStatusLabel(b.status);
            
            return (
              <Link
                key={b.id}
                href={`/${locale}/bookings/${b.id}`}
                className="flex gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Image avec badge de statut */}
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0">
                  {b.listing.photos?.[0]?.url ? (
                    <>
                      <S3Image
                        src={b.listing.photos[0].url}
                        alt={getListingTitle(b.listing)}
                        className="h-full w-full rounded-xl object-cover"
                      />
                      <BookingStatusBadge status={b.status} label={statusLabel} />
                    </>
                  ) : (
                    <div className="h-full w-full rounded-xl bg-muted" />
                  )}
                </div>

                {/* Détails */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-base font-bold text-black">
                    {getListingTitle(b.listing)}
                  </p>
                  {host && (
                    <p className="text-sm text-gray-600">
                      {tListing('by').replace(':', '').trim()} {host}
                    </p>
                  )}
                  {location && (
                    <p className="text-sm text-gray-600">
                      {location}
                    </p>
                  )}
                  <p className="text-sm font-bold text-black mt-1">
                    {formatDate(b.startAt, locale)} → {formatDate(b.endAt, locale)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {data.items.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">
            {tBooking('noBookingsYet')}{' '}
            <Link href={`/${locale}/location`} className="text-primary underline">{tBooking('browseListings')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
