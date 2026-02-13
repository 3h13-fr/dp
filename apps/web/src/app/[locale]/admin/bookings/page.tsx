'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';

type Booking = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: unknown;
  currency: string;
  listing: { id: string; title?: string | null; displayName?: string | null; type: string; slug?: string };
  guest: { id: string; firstName: string | null; lastName: string | null; email: string };
};

export default function AdminBookingsPage() {
  const locale = useLocale();
  const t = useTranslations('admin.nav');
  const [data, setData] = useState<{ items: Booking[]; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=50` : '?limit=50';
    apiFetch(`/admin/bookings${q}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [statusFilter]);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('bookings')}</h1>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{data.total} total</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>
      {data.items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No bookings</p>
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
                  <td className="p-3">{b.listing ? getListingTitle(b.listing) : '—'}</td>
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
                    <Link href={`/${locale}/admin/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                      View
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
