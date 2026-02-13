'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';

type ListingRow = {
  id: string;
  title?: string | null;
  displayName?: string | null;
  type: string;
  status: string;
  host: { email: string; firstName: string | null; lastName: string | null };
  photos: { url: string }[];
};

type ListingTypeFilter = 'all' | 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE';

export default function AdminListingsPage() {
  const locale = useLocale();
  const t = useTranslations('hostNav');
  const tAdmin = useTranslations('admin.listings');
  const [data, setData] = useState<{ items: ListingRow[]; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>('all');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    // Pour "Location" (CAR_RENTAL), on ne filtre pas côté API car on veut inclure aussi CHAUFFEUR
    // Le filtrage se fera côté client
    if (typeFilter !== 'all' && typeFilter !== 'CAR_RENTAL') {
      params.set('type', typeFilter);
    }
    params.set('limit', '50');
    const q = params.toString() ? `?${params.toString()}` : '?limit=50';
    apiFetch(`/admin/listings${q}`)
      .then((res) => res.json())
      .then((result) => {
        // Filtrer côté client pour "Location" (inclure CAR_RENTAL et CHAUFFEUR)
        if (typeFilter === 'CAR_RENTAL' && result && Array.isArray(result.items)) {
          const filteredItems = result.items.filter((item: ListingRow) => 
            item.type === 'CAR_RENTAL' || item.type === 'CHAUFFEUR'
          );
          setData({ items: filteredItems, total: filteredItems.length });
        } else {
          setData(result);
        }
      })
      .catch(() => setData({ items: [], total: 0 }));
  }, [statusFilter, typeFilter]);

  const updateStatus = async (id: string, status: string, currentStatus: string) => {
    // Demander une raison si le statut change vers SUSPENDED ou DRAFT (rejet)
    let reason: string | undefined;
    if (status === 'SUSPENDED' || (status === 'DRAFT' && (currentStatus === 'PENDING' || currentStatus === 'ACTIVE'))) {
      const promptText =
        status === 'SUSPENDED' ? tAdmin('suspensionReason') : tAdmin('rejectionReason');
      const reasonInput = window.prompt(promptText);
      if (reasonInput === null) {
        // L'utilisateur a annulé
        return;
      }
      reason = reasonInput.trim() || undefined;
    }

    await apiFetch(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((l) => (l.id === id ? { ...l, status } : l)),
          }
        : null,
    );
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  const tabs = [
    { value: 'all' as ListingTypeFilter, label: t('all') },
    { value: 'CAR_RENTAL' as ListingTypeFilter, label: t('locations') },
    { value: 'MOTORIZED_EXPERIENCE' as ListingTypeFilter, label: t('experiences') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Listings (moderation)</h1>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{data.total} total</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING">PENDING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <nav className="-mb-px flex gap-4" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={typeFilter === tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4 space-y-4">
        {data.items.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-lg border border-border p-4"
          >
            <div className="flex gap-4">
              {l.photos[0]?.url && (
                <img src={l.photos[0].url} alt="" className="h-16 w-24 rounded object-cover" />
              )}
              <div>
                <p className="font-medium">{getListingTitle(l)}</p>
                <div className="mt-1 flex items-center gap-2">
                  {l.type === 'CAR_RENTAL' && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {t('locationAlone')}
                    </span>
                  )}
                  {l.type === 'CHAUFFEUR' && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {t('locationWithDriver')}
                    </span>
                  )}
                  {l.type === 'MOTORIZED_EXPERIENCE' && (
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      {t('experiences')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {l.host.email}
                </p>
                <p className="text-xs text-muted-foreground">Status: {l.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/admin/listings/${l.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Detail
              </Link>
              <select
                value={l.status}
                onChange={(e) => updateStatus(l.id, e.target.value, l.status)}
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
