'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingActionsProps {
  booking: {
    id: string;
    status: BookingStatus;
    startAt: string;
    endAt: string;
  };
  onStatusChange?: () => void;
}

export function BookingActions({ booking, onStatusChange }: BookingActionsProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking.actions');
  const tCommon = useTranslations('booking');
  const [loading, setLoading] = useState<string | null>(null);

  const now = new Date();
  const startDate = new Date(booking.startAt);
  const endDate = new Date(booking.endAt);
  const isToday = now.toDateString() === startDate.toDateString();
  const isDuring = now >= startDate && now <= endDate;
  const isAfterEnd = now > endDate;

  const handleCancel = async () => {
    if (!confirm(tCommon('cancelConfirm'))) return;
    setLoading('cancel');
    try {
      const res = await apiFetch(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        onStatusChange?.();
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleReportIssue = async () => {
    const message = window.prompt(
      tCommon('reportIssue') + ' – ' + (locale === 'fr' ? 'Décrivez le problème' : 'Describe the issue')
    );
    if (!message?.trim()) return;
    setLoading('report');
    try {
      const res = await apiFetch(`/bookings/${booking.id}/report-issue`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      if (res.ok) {
        alert(tCommon('reportIssueSent'));
      }
    } finally {
      setLoading(null);
    }
  };

  const getActions = () => {
    const actions: Array<{ key: string; label: string; href?: string; onClick?: () => void; variant: 'primary' | 'secondary' }> = [];

    switch (booking.status) {
      case 'PENDING':
        actions.push(
          {
            key: 'pay',
            label: t('payNow'),
            href: `/${locale}/bookings/${booking.id}/pay`,
            variant: 'primary',
          },
          {
            key: 'cancel',
            label: tCommon('cancelBooking'),
            onClick: handleCancel,
            variant: 'secondary',
          },
          {
            key: 'contact',
            label: t('contactHost'),
            href: `/${locale}/messages?bookingId=${booking.id}`,
            variant: 'secondary',
          }
        );
        break;

      case 'CONFIRMED':
        if (isToday || isDuring) {
          // Le jour J ou pendant
          actions.push(
            {
              key: 'checkin',
              label: t('checkIn'),
              href: `#checkin`, // TODO: implémenter check-in
              variant: 'primary',
            },
            {
              key: 'route',
              label: t('route'),
              href: `#route`, // TODO: implémenter itinéraire
              variant: 'secondary',
            },
            {
              key: 'contact',
              label: t('contactHost'),
              href: `/${locale}/messages?bookingId=${booking.id}`,
              variant: 'secondary',
            }
          );
        } else {
          // Avant le jour J
          actions.push(
            {
              key: 'cancel',
              label: tCommon('cancelBooking'),
              onClick: handleCancel,
              variant: 'secondary',
            },
            {
              key: 'contact',
              label: t('contactHost'),
              href: `/${locale}/messages?bookingId=${booking.id}`,
              variant: 'secondary',
            }
          );
        }
        break;

      case 'IN_PROGRESS':
        actions.push(
          {
            key: 'report',
            label: t('reportIssue'),
            onClick: handleReportIssue,
            variant: 'secondary',
          },
          {
            key: 'chat',
            label: t('chat'),
            href: `/${locale}/messages?bookingId=${booking.id}`,
            variant: 'secondary',
          },
          {
            key: 'documents',
            label: t('viewDocuments'),
            href: `#documents`,
            variant: 'secondary',
          }
        );
        break;

      case 'COMPLETED':
        actions.push(
          {
            key: 'review',
            label: t('leaveReview'),
            href: `#review`,
            variant: 'primary',
          },
          {
            key: 'invoice',
            label: t('downloadInvoice'),
            href: `#invoice`, // TODO: implémenter téléchargement facture
            variant: 'secondary',
          },
          {
            key: 'rebook',
            label: t('rebook'),
            href: `#rebook`, // TODO: implémenter re-réservation
            variant: 'secondary',
          }
        );
        break;

      case 'CANCELLED':
        actions.push(
          {
            key: 'rebook',
            label: t('rebook'),
            href: `#rebook`,
            variant: 'primary',
          }
        );
        break;
    }

    return actions.slice(0, 3); // Max 3 actions visibles
  };

  const actions = getActions();

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="space-y-2">
        {actions.map((action) => {
          const baseClasses = 'w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50';
          const primaryClasses = 'bg-primary text-primary-foreground hover:bg-primary/90';
          const secondaryClasses = 'border border-border bg-background hover:bg-muted';

          const className = `${baseClasses} ${action.variant === 'primary' ? primaryClasses : secondaryClasses}`;
          const isLoading = loading === action.key;

          if (action.href) {
            return (
              <Link key={action.key} href={action.href} className={className}>
                {isLoading ? tCommon('common.loading') : action.label}
              </Link>
            );
          }

          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={isLoading}
              className={className}
            >
              {isLoading ? tCommon('common.loading') : action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
