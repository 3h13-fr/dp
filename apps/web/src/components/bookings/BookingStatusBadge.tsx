'use client';

import { useTranslations } from 'next-intl';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className = '' }: BookingStatusBadgeProps) {
  const t = useTranslations('booking.status');

  const statusConfig: Record<BookingStatus, { label: string; bgColor: string; textColor: string }> = {
    PENDING: {
      label: t('pending'),
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
    },
    CONFIRMED: {
      label: t('confirmed'),
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    IN_PROGRESS: {
      label: t('ongoing'),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    COMPLETED: {
      label: t('completed'),
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    },
    CANCELLED: {
      label: t('cancelled'),
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
    },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}
