'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function SearchBarLocation() {
  const t = useTranslations('searchLocation');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('city') ?? searchParams.get('country') ?? '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? '');
  const [seats, setSeats] = useState(searchParams.get('seats') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('type', 'CAR_RENTAL');
    if (place.trim()) params.set('city', place.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (seats.trim()) params.set('seats', seats.trim());
    router.push(`/${locale}/listings/location?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex flex-1 min-w-[200px] flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('placeholder')}</span>
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('placeholder')}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('startDate')}</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('endDate')}</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('seats')}</span>
        <input
          type="number"
          min={1}
          max={9}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          placeholder="—"
          className="w-20 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:opacity-90"
      >
        {t('button')}
      </button>
    </form>
  );
}
