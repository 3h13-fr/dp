'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function SearchBarExperience() {
  const t = useTranslations('searchExperience');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('city') ?? searchParams.get('country') ?? '');
  const [date, setDate] = useState(searchParams.get('date') ?? '');
  const [duration, setDuration] = useState(searchParams.get('duration') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('type', 'MOTORIZED_EXPERIENCE');
    if (place.trim()) params.set('city', place.trim());
    if (date) params.set('date', date);
    if (duration.trim()) params.set('duration', duration.trim());
    router.push(`/${locale}/listings/experience?${params.toString()}`);
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
        <span className="text-sm text-muted-foreground">{t('date')}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t('duration')}</span>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="ex: 2h"
          className="w-28 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
