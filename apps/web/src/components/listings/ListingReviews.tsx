'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null };
};

type Stats = { average: number; count: number };

export function ListingReviews({ listingId }: { listingId: string }) {
  const t = useTranslations('listing');
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/listings/${listingId}/reviews/stats`).then((r) => (r.ok ? r.json() : { average: 0, count: 0 })),
      fetch(`${API_URL}/listings/${listingId}/reviews?limit=10`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, list]) => {
        if (!cancelled) {
          setStats(s);
          setReviews(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ average: 0, count: 0 });
          setReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[var(--color-gray)]">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        …
      </span>
    );
  }

  const count = stats?.count ?? 0;
  const average = stats?.average ?? 0;

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[var(--color-gray)]">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        {t('noReviews')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-gray)]">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      {average.toFixed(1)} · {t('reviewCount', { count })}
    </span>
  );
}

export function ListingReviewsSection({ listingId }: { listingId: string }) {
  const t = useTranslations('listing');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/listings/${listingId}/reviews/stats`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/listings/${listingId}/reviews?limit=20`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, list]) => {
        if (!cancelled) {
          setStats(s ?? { average: 0, count: 0 });
          setReviews(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ average: 0, count: 0 });
          setReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId]);

  if (loading || !stats || stats.count === 0) return null;

  return (
    <section className="border-b border-[var(--color-gray-light)] py-6">
      <h2 className="text-lg font-semibold text-[var(--color-black)]">{t('reviews')}</h2>
      <p className="mt-1 text-sm text-[var(--color-gray)]">
        {t('averageRating')}: {stats.average.toFixed(1)} · {t('reviewCount', { count: stats.count })}
      </p>
      <ul className="mt-4 space-y-4">
        {reviews.map((rev) => (
          <li key={rev.id} className="rounded-lg border border-[var(--color-gray-light)] bg-[var(--color-gray-bg)] p-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--color-black)]">
                {`${rev.author?.firstName ?? ''} ${rev.author?.lastName ?? ''}`.trim() || '—'}
              </span>
              <span className="text-sm text-[var(--color-gray)]">
                {rev.rating}/5 · {new Date(rev.createdAt).toLocaleDateString()}
              </span>
            </div>
            {rev.comment && <p className="mt-2 text-sm text-[var(--color-gray-dark)]">{rev.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
