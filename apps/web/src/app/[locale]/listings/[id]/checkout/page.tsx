'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tErrors = useTranslations('errors');
  const listingId = String(params.id);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getToken()) {
      router.push(`/${locale}/login?redirect=${encodeURIComponent(`/listings/${listingId}/checkout`)}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
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
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">
        {t('listing')}: <Link href={`/${locale}/listings/${listingId}`} className="text-primary underline">{listingId}</Link>
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
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
          {loading ? t('creating') : t('continueToPayment')}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('loginRequired')}
      </p>
    </div>
  );
}
