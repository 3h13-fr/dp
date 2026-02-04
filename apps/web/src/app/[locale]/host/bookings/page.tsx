'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type Booking = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: unknown;
  currency: string;
  listing: { id: string; title: string; type: string };
  guest: { id: string; firstName: string | null; lastName: string | null; email: string };
};

export default function HostBookingsPage() {
  const locale = useLocale();
  const [data, setData] = useState<{ items: Booking[]; total: number } | null>(null);

  useEffect(() => {
    apiFetch('/bookings/host?limit=50')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('incomingBookingsTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('bookingsCount', { count: data.total })}
      </p>
      {data.items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t('noBookings')}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3">Listing</th>
                <th className="p-3">Guest</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3">{b.listing?.title}</td>
                  <td className="p-3">
                    {[b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || '—'}
                  </td>
                  <td className="p-3">
                    {new Date(b.startAt).toLocaleDateString()} – {new Date(b.endAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {String(b.totalAmount)} {b.currency}
                  </td>
                  <td className="p-3">{b.status}</td>
                  <td className="p-3">
                    <Link href={`/${locale}/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                      View
                    </Link>
                    {' · '}
                    <Link href={`/${locale}/messages?bookingId=${b.id}`} className="font-medium text-primary hover:underline">
                      Message
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
