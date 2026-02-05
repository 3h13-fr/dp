'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';
import { CheckoutSummary } from './CheckoutSummary';

type Listing = {
  id: string;
  slug?: string;
  title?: string | null;
  displayName?: string | null;
  displayTitle?: string | null;
  type?: string;
  pricePerDay?: { toNumber?: () => number } | number | null;
  currency?: string;
  caution?: { toNumber?: () => number } | number | null;
  cancellationPolicy?: string | null;
  photos?: Array<{ url: string; order?: number }>;
  host?: { id: string; firstName?: string | null; lastName?: string | null };
};

type CheckoutFormProps = {
  listing: Listing;
  vertical: 'location' | 'experience' | 'ride';
};

export function CheckoutForm({ listing, vertical }: CheckoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tErrors = useTranslations('errors');
  const slug = listing.slug ?? listing.id;
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const datesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = searchParams.get('startAt');
    const end = searchParams.get('endAt');
    if (start) setStartAt(start.slice(0, 16));
    if (end) setEndAt(end.slice(0, 16));
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDatesFocus = useCallback(() => {
    datesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstInput = datesSectionRef.current?.querySelector<HTMLInputElement>('input');
    firstInput?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getToken()) {
      router.push(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/${vertical}/${slug}/checkout`)}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      const booking = await res.json();
      if (!res.ok) throw new Error(booking.message ?? tErrors('loginFailed'));
      router.push(`/${locale}/bookings/${booking.id}/pay`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErrors('generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,400px]">
      {/* Left: form */}
      <div className="px-4 py-8 lg:px-0">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('listing')}:{' '}
          <Link href={`/${locale}/${vertical}/${slug}`} className="text-primary underline">
            {getListingTitle(listing)}
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div ref={datesSectionRef}>
            <label className="block text-sm font-medium">{t('startDate')}</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('endDate')}</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? t('creating') : t('confirmAndPay')}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">{t('loginRequired')}</p>
      </div>

      {/* Right: sticky summary */}
      <div className="order-first px-4 lg:order-none lg:sticky lg:top-24 lg:self-start lg:px-0">
        <CheckoutSummary
          listing={listing}
          vertical={vertical}
          startAt={startAt}
          endAt={endAt}
          onDatesFocus={handleDatesFocus}
        />
      </div>
    </div>
  );
}
