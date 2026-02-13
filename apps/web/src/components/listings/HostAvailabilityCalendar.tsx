'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type DayItem = { date: string; available: boolean; priceOverride: number | null };

export function HostAvailabilityCalendar({ listingId }: { listingId: string }) {
  const t = useTranslations('hostNav');
  const [days, setDays] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fromStr = new Date().toISOString().slice(0, 10);
  const toStr = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const fetchAvailability = () => {
    setLoading(true);
    apiFetch(`/availability/listings/${listingId}?from=${fromStr}&to=${toStr}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DayItem[]) => {
        const fromDate = new Date(fromStr);
        const toDate = new Date(toStr);
        const byDate = new Map<string, DayItem>(Array.isArray(data) ? data.map((d) => [d.date, d]) : []);
        const result: DayItem[] = [];
        const d = new Date(fromDate);
        d.setUTCHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setUTCHours(0, 0, 0, 0);
        while (d <= end) {
          const dateStr = d.toISOString().slice(0, 10);
          const existing = byDate.get(dateStr);
          result.push(
            existing ?? { date: dateStr, available: true, priceOverride: null },
          );
          d.setDate(d.getDate() + 1);
        }
        setDays(result);
      })
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAvailability();
  }, [listingId]);

  const handleToggle = async (date: string, currentAvailable: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/availability/listings/${listingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          dates: [{ date, available: !currentAvailable }],
        }),
      });
      if (res.ok) {
        setDays((prev) =>
          prev.map((d) => (d.date === date ? { ...d, available: !currentAvailable } : d)),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">{t('availabilityCalendar')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">…</p>
      </div>
    );
  }

  const availableCount = days.filter((d) => d.available).length;
  const unavailableCount = days.filter((d) => !d.available).length;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">{t('availabilityCalendar')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('availabilityHint')}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {availableCount} available · {unavailableCount} blocked
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {days.slice(0, 42).map((d) => (
          <button
            key={d.date}
            type="button"
            disabled={saving}
            onClick={() => handleToggle(d.date, d.available)}
            className={`inline-block rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              d.available
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
            }`}
            title={`${d.date} — ${d.available ? 'available' : 'blocked'} (click to toggle)`}
            data-testid={`availability-day-${d.date}`}
          >
            {new Date(d.date + 'T12:00:00').getDate()}
          </button>
        ))}
      </div>
      {days.length > 42 && (
        <p className="mt-2 text-xs text-muted-foreground">+{days.length - 42} more days</p>
      )}
    </div>
  );
}
