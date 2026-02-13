'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';

interface BookingHostCardProps {
  host: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  bookingId: string;
  rating?: number | null;
}

export function BookingHostCard({ host, bookingId, rating }: BookingHostCardProps) {
  const locale = useLocale();
  const t = useTranslations('booking.host');

  const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || 'Hôte';

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h2 className="mb-4 text-lg font-semibold">{t('hostedBy')}</h2>
      <div className="flex items-start gap-4">
        {host.avatarUrl ? (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
            <S3Image
              src={host.avatarUrl}
              alt={hostName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl">👤</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{hostName}</p>
          {rating && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm text-muted-foreground">
                {rating.toFixed(1)} {t('rating')}
              </span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/messages?bookingId=${bookingId}`}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-center text-sm font-medium hover:bg-muted"
            >
              {t('message')}
            </Link>
            <button
              type="button"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-center text-sm font-medium hover:bg-muted"
              onClick={() => {
                // TODO: Implémenter appel téléphonique
                alert('Fonctionnalité d\'appel à venir');
              }}
            >
              {t('call')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
