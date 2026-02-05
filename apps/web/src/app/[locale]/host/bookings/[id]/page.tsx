'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';

export default function HostBookingDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const id = String(params.id);
  const t = useTranslations('hostNav');
  const tBooking = useTranslations('booking');
  const [reporting, setReporting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{
    id: string;
    status: string;
    startAt: string;
    endAt: string;
    totalAmount: string;
    currency: string;
    cautionAmount: string | null;
    listing: { id: string; title?: string | null; displayName?: string | null; type: string; slug?: string };
    guest: { firstName: string | null; lastName: string | null; email?: string };
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/bookings/${id}`)
      .then((r) => (r.status === 404 ? null : r.json()))
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => {
        setBooking(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="px-4 py-8 text-muted-foreground">{tBooking('common.loading')}</p>;
  if (!booking) {
    return (
      <div>
        <p className="text-muted-foreground">{t('bookingNotFound')}</p>
        <Link href={`/${locale}/host/bookings`} className="mt-4 inline-block text-primary underline">
          ← {t('backToBookings')}
        </Link>
      </div>
    );
  }

  const listingSlug = (booking.listing as { slug?: string }).slug ?? booking.listing.id;
  const listingPublicPath =
    booking.listing.type === 'CAR_RENTAL'
      ? 'location'
      : booking.listing.type === 'MOTORIZED_EXPERIENCE'
        ? 'experience'
        : 'ride';
  const listingUrl = `/${locale}/${listingPublicPath}/${listingSlug}`;
  const guestName = [booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div>
      <Link href={`/${locale}/host/bookings`} className="mb-4 inline-block text-sm text-primary hover:underline">
        ← {t('backToBookings')}
      </Link>
      <h1 className="text-2xl font-bold">{tBooking('title')}</h1>
      <p className="mt-1 text-muted-foreground">
        <Link href={listingUrl} className="text-primary underline">
          {getListingTitle(booking.listing)}
        </Link>
      </p>
      <dl className="mt-6 space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">{t('guestLabel')}</dt>
          <dd className="font-medium">{guestName}</dd>
          {booking.guest?.email && (
            <dd className="text-sm text-muted-foreground">{booking.guest.email}</dd>
          )}
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{tBooking('status')}</dt>
          <dd className="font-medium">{booking.status}</dd>
        </div>
        {booking.status === 'CANCELLED' && (
          <div>
            <dt className="text-sm text-muted-foreground" />
            <dd className="text-sm text-muted-foreground">{tBooking('refundInfo')}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">{tBooking('dates')}</dt>
          <dd>
            {new Date(booking.startAt).toLocaleString()} – {new Date(booking.endAt).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{tBooking('total')}</dt>
          <dd>
            {booking.totalAmount} {booking.currency}
          </dd>
        </div>
        {booking.cautionAmount && (
          <div>
            <dt className="text-sm text-muted-foreground">{tBooking('caution')}</dt>
            <dd>
              {booking.cautionAmount} {booking.currency}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        {booking.status === 'PENDING' && (
          <>
            <button
              type="button"
              disabled={statusUpdating}
              onClick={async () => {
                setStatusUpdating(true);
                try {
                  const res = await apiFetch(`/bookings/${booking.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'CONFIRMED' }),
                  });
                  if (res.ok) setBooking((b) => (b ? { ...b, status: 'CONFIRMED' } : null));
                } finally {
                  setStatusUpdating(false);
                }
              }}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {t('confirmBooking')}
            </button>
            <button
              type="button"
              disabled={statusUpdating}
              onClick={async () => {
                if (!confirm(t('refuseConfirm'))) return;
                setStatusUpdating(true);
                try {
                  const res = await apiFetch(`/bookings/${booking.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'CANCELLED' }),
                  });
                  if (res.ok) setBooking((b) => (b ? { ...b, status: 'CANCELLED' } : null));
                } finally {
                  setStatusUpdating(false);
                }
              }}
              className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted disabled:opacity-50"
            >
              {t('refuseBooking')}
            </button>
          </>
        )}
        <Link
          href={`/${locale}/messages?bookingId=${booking.id}`}
          className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted"
        >
          {tBooking('message')}
        </Link>
        <button
          type="button"
          disabled={reporting}
          onClick={async () => {
            const message = window.prompt(
              tBooking('reportIssue') + ' – ' + (locale === 'fr' ? 'Décrivez le problème' : 'Describe the issue')
            );
            if (!message?.trim()) return;
            setReporting(true);
            try {
              const res = await apiFetch(`/bookings/${booking.id}/report-issue`, {
                method: 'POST',
                body: JSON.stringify({ message: message.trim() }),
              });
              if (res.ok) alert(tBooking('reportIssueSent'));
            } finally {
              setReporting(false);
            }
          }}
          className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted disabled:opacity-50"
        >
          {tBooking('reportIssue')}
        </button>
      </div>
    </div>
  );
}
