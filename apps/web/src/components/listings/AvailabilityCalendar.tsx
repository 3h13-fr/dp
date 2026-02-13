'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type DayItem = { date: string; available: boolean; priceOverride: number | null };

export function AvailabilityCalendar({
  listingId,
  from,
  to,
}: {
  listingId: string;
  from?: string;
  to?: string;
}) {
  const t = useTranslations('listing');
  const [days, setDays] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fromStr = from ?? new Date().toISOString().slice(0, 10);
  const toStr = to ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('from', fromStr);
    params.set('to', toStr);
    fetch(`${API_URL}/availability/listings/${listingId}?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DayItem[]) => setDays(Array.isArray(data) ? data : []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [listingId, fromStr, toStr]);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-semibold text-neutral-800">{t('availability')}</h3>
        <p className="mt-2 text-sm text-neutral-500">…</p>
      </div>
    );
  }

  const availableCount = days.filter((d) => d.available).length;
  const unavailableCount = days.filter((d) => !d.available).length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold text-neutral-800">{t('availability')}</h3>
      <p className="mt-1 text-xs text-neutral-500">
        {availableCount} {t('availableDays')} · {unavailableCount} {t('unavailable')}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {days.slice(0, 42).map((d) => (
          <span
            key={d.date}
            className={`inline-block rounded px-2 py-1 text-xs font-medium ${
              d.available ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'
            }`}
            title={d.date}
          >
            {new Date(d.date + 'T12:00:00').getDate()}
          </span>
        ))}
      </div>
      {days.length > 42 && (
        <p className="mt-2 text-xs text-neutral-500">+{days.length - 42} {t('moreDays')}</p>
      )}
    </div>
  );
}
