'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = String(params.id);
  const [cancelling, setCancelling] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<{
    id: string;
    status: string;
    startAt: string;
    endAt: string;
    totalAmount: string;
    currency: string;
    cautionAmount: string | null;
    listing: { id: string; title: string; type: string };
    guest: { firstName: string | null; lastName: string | null };
    host: { firstName: string | null; lastName: string | null };
  } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login?redirect=/bookings/${id}`);
      return;
    }
    setLoading(true);
    apiFetch(`/bookings/${id}`)
      .then((r) => (r.status === 404 ? null : r.json()))
      .then((data) => { setBooking(data); setLoading(false); })
      .catch(() => { setBooking(null); setLoading(false); });
  }, [id, router, locale]);

  const t = useTranslations('booking');
  if (loading) return <p className="px-4 py-8 text-muted-foreground">{t('common.loading')}</p>;
  if (!booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-muted-foreground">{locale === 'fr' ? 'Réservation introuvable.' : 'Booking not found.'}</p>
        <Link href={`/${locale}/bookings`} className="mt-4 inline-block text-primary underline">
          ← {t('myTrips')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">
        <Link href={`/${locale}/listings/${booking.listing.id}`} className="text-primary underline">{booking.listing.title}</Link>
      </p>
      <dl className="mt-6 space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">{t('status')}</dt>
          <dd className="font-medium">{booking.status}</dd>
        </div>
        {booking.status === 'CANCELLED' && (
          <div>
            <dt className="text-sm text-muted-foreground" />
            <dd className="text-sm text-muted-foreground">{t('refundInfo')}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">{t('dates')}</dt>
          <dd>{new Date(booking.startAt).toLocaleString()} – {new Date(booking.endAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t('total')}</dt>
          <dd>{booking.totalAmount} {booking.currency}</dd>
        </div>
        {booking.cautionAmount && (
          <div>
            <dt className="text-sm text-muted-foreground">{t('caution')}</dt>
            <dd>{booking.cautionAmount} {booking.currency}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">{t('hostLabel')}</dt>
          <dd>{booking.host?.firstName} {booking.host?.lastName}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/${locale}/messages?bookingId=${booking.id}`}
          className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted"
        >
          {t('message')}
        </Link>
        <button
          type="button"
          disabled={reporting}
          onClick={async () => {
            const message = window.prompt(t('reportIssue') + ' – ' + (locale === 'fr' ? 'Décrivez le problème' : 'Describe the issue'));
            if (!message?.trim()) return;
            setReporting(true);
            try {
              const res = await apiFetch(`/bookings/${booking.id}/report-issue`, {
                method: 'POST',
                body: JSON.stringify({ message: message.trim() }),
              });
              if (res.ok) alert(t('reportIssueSent'));
            } finally {
              setReporting(false);
            }
          }}
          className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted disabled:opacity-50"
        >
          {t('reportIssue')}
        </button>
        {booking.status === 'PENDING' && (
          <Link
            href={`/${locale}/bookings/${booking.id}/pay`}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            {t('payNow')}
          </Link>
        )}
        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              if (!confirm(t('cancelConfirm'))) return;
              setCancelling(true);
              try {
                const res = await apiFetch(`/bookings/${booking.id}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'CANCELLED' }),
                });
                if (res.ok) router.replace(`/${locale}/bookings`);
                else setBooking((b) => b ? { ...b, status: 'CANCELLED' } : null);
              } finally {
                setCancelling(false);
              }
            }}
            className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted disabled:opacity-50"
          >
            {cancelling ? t('cancelling') : t('cancelBooking')}
          </button>
        )}
      </div>
      <p className="mt-6">
        <Link href={`/${locale}/bookings`} className="text-primary underline">← {t('myTrips')}</Link>
      </p>
    </div>
  );
}
