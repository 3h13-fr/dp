'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayTitle?: string | null;
  displayName?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
};

const CLEANING_FEE = 0; // optional, can come from listing later

export function ReservationModule({
  listing,
  vertical = 'location',
}: {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
}) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const slug = listing.slug ?? listing.id;
  const pricePerDay =
    listing.pricePerDay != null
      ? typeof listing.pricePerDay === 'object' && typeof listing.pricePerDay.toNumber === 'function'
        ? listing.pricePerDay.toNumber()
        : Number(listing.pricePerDay)
      : null;

  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const { days, subtotal, total } = useMemo(() => {
    if (!pricePerDay || !startAt || !endAt) return { days: 0, subtotal: 0, total: 0 };
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    if (end <= start) return { days: 0, subtotal: 0, total: 0 };
    const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) || 1;
    const subtotal = pricePerDay * days;
    const total = subtotal + CLEANING_FEE;
    return { days, subtotal, total };
  }, [pricePerDay, startAt, endAt]);

  const checkoutHref = (() => {
    const base = `/${locale}/${vertical}/${slug}/checkout`;
    if (startAt && endAt) {
      const params = new URLSearchParams();
      params.set('startAt', startAt);
      params.set('endAt', endAt);
      return `${base}?${params.toString()}`;
    }
    return base;
  })();

  const currency = listing.currency ?? 'EUR';
  const formatPrice = (n: number) => `${n} ${currency}`;

  return (
    <div
      className="sticky top-24 rounded-2xl border border-[var(--color-gray-light)] bg-white p-6 shadow-[var(--shadow-card)]"
      data-testid="reservation-module"
    >
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--color-black)]">
          {pricePerDay != null ? formatPrice(pricePerDay) : '—'}
        </span>
        <span className="text-[var(--color-gray)]">{t('perDay')}</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-gray-dark)]">
            {t('tripStart')}
          </label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-ds-input border border-[var(--color-gray-light)] bg-white px-3 py-2.5 text-sm text-[var(--color-gray-dark)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-gray-dark)]">
            {t('tripEnd')}
          </label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-ds-input border border-[var(--color-gray-light)] bg-white px-3 py-2.5 text-sm text-[var(--color-gray-dark)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            min={startAt || new Date().toISOString().slice(0, 16)}
          />
        </div>
      </div>

      {days > 0 && pricePerDay != null && (
        <div className="mt-4 space-y-2 border-t border-[var(--color-gray-light)] pt-4 text-sm">
          <div className="flex justify-between text-[var(--color-gray-dark)]">
            <span>
              {formatPrice(pricePerDay)} × {t('daysCount', { count: days })}
            </span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {CLEANING_FEE > 0 && (
            <div className="flex justify-between text-[var(--color-gray-dark)]">
              <span>{t('cleaningFee')}</span>
              <span>{formatPrice(CLEANING_FEE)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[var(--color-black)]">
            <span>{t('total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      <Link
        href={checkoutHref}
        className="mt-6 flex w-full items-center justify-center rounded-ds-button bg-[var(--color-primary)] px-6 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        data-testid="listing-book-link"
      >
        {vertical === 'ride' ? t('reservationRequest') : t('reserve')}
      </Link>
    </div>
  );
}
