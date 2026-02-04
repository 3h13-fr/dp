'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = String(params.id);
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
    apiFetch(`/bookings/${id}`)
      .then((r) => r.json())
      .then(setBooking)
      .catch(() => setBooking(null));
  }, [id, router, locale]);

  if (!booking) return <p className="px-4 py-8 text-muted-foreground">Loading...</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Booking</h1>
      <p className="mt-1 text-muted-foreground">
        <Link href={`/${locale}/listings/${booking.listing.id}`} className="text-primary underline">{booking.listing.title}</Link>
      </p>
      <dl className="mt-6 space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="font-medium">{booking.status}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Dates</dt>
          <dd>{new Date(booking.startAt).toLocaleString()} – {new Date(booking.endAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Total</dt>
          <dd>{booking.totalAmount} {booking.currency}</dd>
        </div>
        {booking.cautionAmount && (
          <div>
            <dt className="text-sm text-muted-foreground">Caution</dt>
            <dd>{booking.cautionAmount} {booking.currency}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted-foreground">Host</dt>
          <dd>{booking.host?.firstName} {booking.host?.lastName}</dd>
        </div>
      </dl>
      {booking.status === 'PENDING' && (
        <Link
          href={`/${locale}/bookings/${booking.id}/pay`}
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          Pay now
        </Link>
      )}
      <p className="mt-6">
        <Link href={`/${locale}/bookings`} className="text-primary underline">← My trips</Link>
      </p>
    </div>
  );
}
