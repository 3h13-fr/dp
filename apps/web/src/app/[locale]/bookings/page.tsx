'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';

type BookingItem = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: string;
  currency: string;
  listing: { id: string; title: string; type: string; photos: { url: string }[] };
  host: { firstName: string | null; lastName: string | null };
};

export default function MyBookingsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [data, setData] = useState<{ items: BookingItem[]; total: number } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login?redirect=/bookings`);
      return;
    }
    apiFetch('/bookings/my')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [router, locale]);

  if (!data) return <p className="px-4 py-8 text-muted-foreground">Loading...</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">My trips</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.total} booking(s)</p>
      <div className="mt-6 space-y-4">
        {data.items.map((b) => (
          <Link
            key={b.id}
            href={`/${locale}/bookings/${b.id}`}
            className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition hover:shadow-md"
          >
            {b.listing.photos?.[0]?.url ? (
              <img src={b.listing.photos[0].url} alt="" className="h-20 w-28 rounded-lg object-cover" />
            ) : (
              <div className="h-20 w-28 rounded-lg bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{b.listing.title}</p>
              <p className="text-sm text-muted-foreground">
                {b.status} · {new Date(b.startAt).toLocaleDateString()} – {new Date(b.endAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{b.totalAmount} {b.currency}</p>
              {b.status === 'PENDING' && (
                <Link
                  href={`/${locale}/bookings/${b.id}/pay`}
                  className="mt-1 block text-sm text-primary underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Pay now
                </Link>
              )}
            </div>
          </Link>
        ))}
      </div>
      {data.items.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          No bookings yet. <Link href={`/${locale}/listings`} className="text-primary underline">Browse listings</Link>
        </p>
      )}
    </div>
  );
}
