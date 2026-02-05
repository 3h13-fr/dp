'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
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
  caution?: unknown;
  city?: string | null;
  country?: string | null;
  host: { id: string; email: string; firstName: string | null; lastName: string | null };
  photos: { id: string; url: string; order: number }[];
};

function publicListingPath(type: string): string {
  if (type === 'CAR_RENTAL') return '/location';
  if (type === 'MOTORIZED_EXPERIENCE') return '/experience';
  if (type === 'CHAUFFEUR') return '/ride';
  return '/listings';
}

export default function HostListingDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const id = String(params.id);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ description: '', pricePerDay: '', currency: 'EUR', caution: '', status: 'DRAFT' });

  useEffect(() => {
    setLoading(true);
    apiFetch(`/listings/${id}`)
      .then((res) => {
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data) => {
        setListing(data);
        if (data) {
          setEditForm({
            description: data.description ?? '',
            pricePerDay: data.pricePerDay != null ? String(data.pricePerDay) : '',
            currency: data.currency ?? 'EUR',
            caution: data.caution != null ? String(data.caution) : '',
            status: data.status ?? 'DRAFT',
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setListing(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-muted-foreground">{t('loading')}</p>;
  if (!listing) {
    return (
      <div>
        <p className="text-muted-foreground">{t('listingNotFound')}</p>
        <Link href={`/${locale}/host`} className="mt-4 inline-block text-primary underline">
          ← {t('backToDashboard')}
        </Link>
      </div>
    );
  }

  const publicBase = publicListingPath(listing.type);
  const publicUrl = `/${locale}${publicBase}/${listing.slug}`;

  return (
    <div>
      <Link href={`/${locale}/host`} className="mb-4 inline-block text-sm text-primary hover:underline">
        ← {t('backToDashboard')}
      </Link>
      <h1 className="text-2xl font-bold">{listing.displayTitle ?? listing.displayName ?? listing.title ?? '—'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {listing.type} · {listing.status}
        {(listing.city || listing.country) && ` · ${[listing.city, listing.country].filter(Boolean).join(', ')}`}
      </p>

      {listing.photos && listing.photos.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">{t('photos')}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.photos.map((p) => (
              <img key={p.id} src={p.url} alt="" className="h-24 w-32 rounded object-cover" />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{t('details')}</h2>
        {listing.pricePerDay != null && (
          <p className="text-sm">
            {String(listing.pricePerDay)} {listing.currency} / day
            {listing.caution != null && listing.caution !== '' && ` · Caution: ${String(listing.caution)} ${listing.currency}`}
          </p>
        )}
        {listing.description && <p className="mt-2 text-sm text-muted-foreground">{listing.description}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">{t('editListing')}</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const res = await apiFetch(`/listings/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  description: editForm.description || undefined,
                  pricePerDay: editForm.pricePerDay ? parseFloat(editForm.pricePerDay) : undefined,
                  currency: editForm.currency || undefined,
                  caution: editForm.caution ? parseFloat(editForm.caution) : undefined,
                  status: editForm.status || undefined,
                }),
              });
              const updated = await res.json();
              setListing((prev) => (prev ? { ...prev, ...updated } : null));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-muted-foreground">{t('description')}</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">{t('pricePerDay')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.pricePerDay}
                onChange={(e) => setEditForm((f) => ({ ...f, pricePerDay: e.target.value }))}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">{t('currency')}</label>
              <input
                type="text"
                value={editForm.currency}
                onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">{t('caution')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.caution}
                onChange={(e) => setEditForm((f) => ({ ...f, caution: e.target.value }))}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">{t('status')}</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </form>
      </section>

      <section className="mt-6">
        <Link href={publicUrl} className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          {t('viewPublicListing')} →
        </Link>
      </section>
    </div>
  );
}
