'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';

interface BookingOwnerSectionProps {
  host: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  bookingId: string;
  isVerified?: boolean;
  isProfessional?: boolean;
}

export function BookingOwnerSection({
  host,
  bookingId,
  isVerified = false,
  isProfessional = false,
}: BookingOwnerSectionProps) {
  const locale = useLocale();
  const t = useTranslations('booking.owner');

  const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || t('host');

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <h2 className="text-xl font-bold">{t('title')}</h2>

      <div className="flex items-start gap-4">
        {/* Avatar */}
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
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}

        {/* Host Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{hostName}</p>
            {isVerified && (
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          {isProfessional && (
            <p className="mt-1 text-sm text-muted-foreground">{t('professional')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
