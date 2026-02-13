'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

function formatDateTime(dateString: string, locale: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

type ReservationDateBlockProps = {
  startAt: string;
  endAt: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  locale: string;
  minStart?: string;
  minEnd?: string;
};

export function ReservationDateBlock({
  startAt,
  endAt,
  onStartChange,
  onEndChange,
  locale,
  minStart,
  minEnd,
}: ReservationDateBlockProps) {
  const t = useTranslations('listing');
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex rounded-lg border border-[var(--color-gray-light)] bg-white">
      <button
        type="button"
        onClick={() => startInputRef.current?.showPicker?.()}
        className="flex min-w-0 flex-1 flex-col items-start px-4 py-3 text-left transition-colors hover:bg-[var(--color-gray-light)]/20 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
      >
        <span className="text-xs font-medium text-[var(--color-gray-dark)]">
          {t('tripStart')}
        </span>
        <span className="mt-1 text-sm font-medium text-[var(--color-gray-dark)]">
          {formatDateTime(startAt, locale)}
        </span>
        <input
          ref={startInputRef}
          type="datetime-local"
          value={startAt}
          onChange={(e) => onStartChange(e.target.value)}
          min={minStart}
          className="sr-only"
          aria-label={t('tripStart')}
        />
      </button>
      <span
        className="my-3 w-px shrink-0 bg-[var(--color-gray-light)]"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => endInputRef.current?.showPicker?.()}
        className="flex min-w-0 flex-1 flex-col items-start px-4 py-3 text-left transition-colors hover:bg-[var(--color-gray-light)]/20 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
      >
        <span className="text-xs font-medium text-[var(--color-gray-dark)]">
          {t('tripEnd')}
        </span>
        <span className="mt-1 text-sm font-medium text-[var(--color-gray-dark)]">
          {formatDateTime(endAt, locale)}
        </span>
        <input
          ref={endInputRef}
          type="datetime-local"
          value={endAt}
          onChange={(e) => onEndChange(e.target.value)}
          min={minEnd || startAt}
          className="sr-only"
          aria-label={t('tripEnd')}
        />
      </button>
    </div>
  );
}
