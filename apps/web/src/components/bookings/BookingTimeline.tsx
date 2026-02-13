'use client';

import { useLocale, useTranslations } from 'next-intl';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingTimelineProps {
  booking: {
    status: BookingStatus;
    startAt: string;
    endAt: string;
    checkInAt?: string | null;
    checkOutAt?: string | null;
  };
}

type TimelineStep = {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'upcoming' | 'cancelled';
  icon: string;
};

export function BookingTimeline({ booking }: BookingTimelineProps) {
  const locale = useLocale();
  const t = useTranslations('booking.timeline');

  const now = new Date();
  const startDate = new Date(booking.startAt);
  const endDate = new Date(booking.endAt);
  const isBeforeStart = now < startDate;
  const isDuring = now >= startDate && now <= endDate;
  const isAfterEnd = now > endDate;

  const getSteps = (): TimelineStep[] => {
    if (booking.status === 'CANCELLED') {
      return [
        {
          id: 'cancelled',
          label: t('cancelled'),
          status: 'cancelled',
          icon: '❌',
        },
      ];
    }

    const steps: TimelineStep[] = [];

    // Étape 1: Réservation confirmée
    if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
      steps.push({
        id: 'confirmed',
        label: t('confirmed'),
        status: 'completed',
        icon: '✔',
      });
    } else if (booking.status === 'PENDING') {
      steps.push({
        id: 'pending',
        label: t('pending'),
        status: 'active',
        icon: '⏳',
      });
      return steps;
    }

    // Étape 2: À venir (si confirmée mais pas encore commencée)
    if (booking.status === 'CONFIRMED' && isBeforeStart) {
      steps.push({
        id: 'upcoming',
        label: t('upcoming'),
        status: 'active',
        icon: '📅',
      });
    }

    // Étape 3: En cours
    if (booking.status === 'IN_PROGRESS' || (booking.status === 'CONFIRMED' && isDuring)) {
      steps.push({
        id: 'ongoing',
        label: t('ongoing'),
        status: booking.status === 'IN_PROGRESS' ? 'active' : 'upcoming',
        icon: '🚗',
      });
    }

    // Étape 4: Terminée
    if (booking.status === 'COMPLETED' || (booking.status === 'IN_PROGRESS' && isAfterEnd)) {
      steps.push({
        id: 'completed',
        label: t('completed'),
        status: booking.status === 'COMPLETED' ? 'completed' : 'upcoming',
        icon: '✅',
      });
    }

    return steps;
  };

  const steps = getSteps();

  const getStepStyles = (step: TimelineStep) => {
    switch (step.status) {
      case 'completed':
        return {
          circle: 'bg-green-500 border-green-500',
          line: 'bg-green-500',
          text: 'text-foreground',
        };
      case 'active':
        return {
          circle: 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
          line: 'bg-border',
          text: 'text-foreground font-semibold',
        };
      case 'upcoming':
        return {
          circle: 'bg-muted border-border',
          line: 'bg-border',
          text: 'text-muted-foreground',
        };
      case 'cancelled':
        return {
          circle: 'bg-red-500 border-red-500',
          line: 'bg-red-500',
          text: 'text-red-600',
        };
      default:
        return {
          circle: 'bg-muted border-border',
          line: 'bg-border',
          text: 'text-muted-foreground',
        };
    }
  };

  if (steps.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="relative">
        {steps.map((step, index) => {
          const styles = getStepStyles(step);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Ligne verticale */}
              {!isLast && (
                <div className="absolute left-[11px] top-8 h-full w-0.5" style={{ zIndex: 0 }}>
                  <div className={`h-full w-full ${styles.line}`} />
                </div>
              )}

              {/* Cercle avec icône */}
              <div className="relative z-10 flex shrink-0 items-center justify-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs ${styles.circle}`}
                >
                  {step.status === 'completed' || step.status === 'cancelled' ? (
                    <span className="text-white">{step.icon}</span>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
              </div>

              {/* Contenu */}
              <div className={`flex-1 pb-6 ${styles.text}`}>
                <p className="font-medium">{step.label}</p>
                {step.status === 'active' && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.id === 'upcoming' && isBeforeStart
                      ? `Début prévu le ${startDate.toLocaleDateString(locale)}`
                      : step.id === 'ongoing'
                      ? 'Votre réservation est en cours'
                      : null}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
