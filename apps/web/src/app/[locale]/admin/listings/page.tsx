'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ListingRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  host: { email: string; firstName: string | null; lastName: string | null };
  photos: { url: string }[];
};

export default function AdminListingsPage() {
  const [data, setData] = useState<{ items: ListingRow[]; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=50` : '?limit=50';
    apiFetch(`/admin/listings${q}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
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
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-muted-foreground">
                  {l.type} · {l.host.email}
                </p>
                <p className="text-xs text-muted-foreground">Status: {l.status}</p>
              </div>
            </div>
            <select
              value={l.status}
              onChange={(e) => updateStatus(l.id, e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
