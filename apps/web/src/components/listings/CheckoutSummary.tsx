'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getListingTitle } from '@/lib/listings';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  displayTitle?: string | null;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  caution?: { toNumber?: () => number } | number | null;
  cancellationPolicy?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
};

type CheckoutSummaryProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
  startAt: string;
  endAt: string;
  onDatesFocus?: () => void;
};

function toNum(
  v: { toNumber?: () => number } | number | null | undefined
): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof v.toNumber === 'function')
    return v.toNumber();
  return Number(v);
}

export function CheckoutSummary({
  listing,
  vertical,
  startAt,
  endAt,
  onDatesFocus,
}: CheckoutSummaryProps) {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const slug = listing.slug ?? listing.id;

  const pricePerDay = toNum(listing.pricePerDay);
  const caution = toNum(listing.caution);
  const currency = listing.currency ?? 'EUR';
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const { days, subtotal } = (() => {
    if (!startAt || !endAt) return { days: 0, subtotal: 0 };
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    if (end <= start) return { days: 0, subtotal: 0 };
    const days = Math.max(
      1,
      Math.ceil((end - start) / (24 * 60 * 60 * 1000))
    );
    const subtotal = pricePerDay * days;
    return { days, subtotal };
  })();

  const photos = listing.photos?.length
    ? [...listing.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const firstPhoto = photos[0];

  const formatDateRange = () => {
    if (!startAt || !endAt) return '—';
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).formatRange(start, end);
    } catch {
      return `${startAt} – ${endAt}`;
    }
  };

  return (
    <div
      className="rounded-2xl border border-[var(--color-gray-light)] bg-white p-6 shadow-[var(--shadow-card)]"
      data-testid="checkout-summary"
    >
      {/* Listing card */}
      <div className="flex gap-4">
        {firstPhoto?.url ? (
          <Link
            href={`/${locale}/${vertical}/${slug}`}
            className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-gray-bg)]"
          >
            <img
              src={firstPhoto.url}
              alt=""
              className="h-full w-full object-cover"
            />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link
            href={`/${locale}/${vertical}/${slug}`}
            className="font-medium text-[var(--color-primary)] underline"
          >
            {getListingTitle(listing)}
          </Link>
        </div>
      </div>

      {/* Cancellation */}
      {listing.cancellationPolicy ? (
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <p className="text-sm font-medium text-[var(--color-black)]">
            {t('cancellation')}
          </p>
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {listing.cancellationPolicy}
          </p>
        </div>
      ) : (
        <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
          <p className="text-sm font-medium text-[var(--color-black)]">
            {t('cancellation')}
          </p>
          <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
            {t('cancellationFree')}
          </p>
        </div>
      )}

      {/* Dates + Modify */}
      <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-black)]">
            {t('dates')}
          </span>
          {onDatesFocus ? (
            <button
              type="button"
              onClick={onDatesFocus}
              className="text-sm font-medium text-[var(--color-primary)] underline"
            >
              {t('modify')}
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
          {formatDateRange()}
        </p>
      </div>

      {/* Price details */}
      <div className="mt-4 border-t border-[var(--color-gray-light)] pt-4">
        <p className="text-sm font-medium text-[var(--color-black)]">
          {t('priceDetails')}
        </p>
        {days > 0 && pricePerDay > 0 ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-gray-dark)]">
              {t('nights', { count: days })} × {formatPrice(pricePerDay)} ={' '}
              {formatPrice(subtotal)}
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-black)]">
              {t('total')} {currency}: {formatPrice(subtotal)}
            </p>
            {caution > 0 ? (
              <p className="mt-1 text-sm text-[var(--color-gray-dark)]">
                {t('cautionBlocked')}: {formatPrice(caution)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-gray)]">
            {t('total')}: —
          </p>
        )}
      </div>
    </div>
  );
}
