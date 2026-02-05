'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { apiFetch } from '@/lib/api';

type ListingDetail = {
  id: string;
  type: string;
  status: string;
  slug: string;
  displayTitle?: string;
  title?: string | null;
  displayName?: string | null;
  description?: string | null;
  pricePerDay?: unknown;
  currency: string;
  host: { id: string; email: string; firstName: string | null; lastName: string | null };
  photos: { id: string; url: string; order: number }[];
  vehicle?: unknown;
};

function publicListingPath(type: string, slug: string): string {
  if (type === 'CAR_RENTAL') return '/location';
  if (type === 'MOTORIZED_EXPERIENCE') return '/experience';
  if (type === 'CHAUFFEUR') return '/ride';
  return '/listings';
}

export default function AdminListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = String(params.id);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/listings/${id}`)
      .then((res) => {
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data) => {
        setListing(data);
        setLoading(false);
      })
      .catch(() => {
        setListing(null);
        setLoading(false);
      });
  }, [id]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/listings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setListing((prev) => (prev ? { ...prev, status } : null));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!listing) {
    return (
      <div>
        <p className="text-muted-foreground">Listing not found.</p>
        <Link href={`/${locale}/admin/listings`} className="mt-4 inline-block text-primary underline">
          ← Back to Listings
        </Link>
      </div>
    );
  }

  const publicBase = publicListingPath(listing.type, listing.slug);
  const publicUrl = `/${locale}${publicBase}/${listing.slug}`;
  const hostName = [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div>
      <Link href={`/${locale}/admin/listings`} className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to Listings
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{listing.displayTitle ?? listing.displayName ?? listing.title ?? '—'}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <select
            value={listing.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={updating}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING">PENDING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {listing.type} · {listing.slug}
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Host</h2>
        <p className="text-sm">{hostName}</p>
        <p className="text-sm text-muted-foreground">{listing.host?.email}</p>
      </section>

      {listing.photos && listing.photos.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.photos.map((p) => (
              <img key={p.id} src={p.url} alt="" className="h-24 w-32 rounded object-cover" />
            ))}
          </div>
        </section>
      )}

      {(listing.pricePerDay != null || listing.description) && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Details</h2>
          {listing.pricePerDay != null && (
            <p className="text-sm">
              {String(listing.pricePerDay)} {listing.currency} / day
            </p>
          )}
          {listing.description && <p className="mt-2 text-sm text-muted-foreground">{listing.description}</p>}
        </section>
      )}

      <section className="mt-6">
        <Link href={publicUrl} className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          View public listing →
        </Link>
      </section>
    </div>
  );
}
