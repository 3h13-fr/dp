'use client';

import { useTranslations } from 'next-intl';

interface BookingReservationDetailsProps {
  bookingId: string;
  cautionAmount?: string | number | null;
  currency: string;
  dailyDistance?: number | null;
  cancellationPolicy?: string | null;
}

export function BookingReservationDetails({
  bookingId,
  cautionAmount,
  currency,
  dailyDistance,
  cancellationPolicy,
}: BookingReservationDetailsProps) {
  const t = useTranslations('booking.reservationDetails');

  const formatAmount = (amount: string | number | null | undefined) => {
    if (!amount) return null;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const shortBookingId = bookingId.slice(0, 8);

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <h2 className="text-xl font-bold">{t('title')}</h2>

      {/* Reservation Number */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{t('reservationNumber')}</p>
        <p className="mt-1 text-base font-semibold">{shortBookingId}</p>
      </div>

      {/* Security Deposit */}
      {cautionAmount && (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-muted-foreground">{t('securityDeposit')}</p>
            <p className="text-lg font-semibold">{formatAmount(cautionAmount)}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('securityDepositDescription')}</p>
        </div>
      )}

      {/* Daily Distance */}
      {dailyDistance && (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-muted-foreground">{t('dailyDistance')}</p>
            <p className="text-lg font-semibold">{dailyDistance} km {t('perDay')}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('dailyDistanceDescription')}</p>
        </div>
      )}

      {/* Cancellation Conditions */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{t('cancellationConditions')}</p>
        <p className="mt-1 text-sm">
          {cancellationPolicy || t('nonRefundable')}
        </p>
      </div>
    </div>
  );
}
