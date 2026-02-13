'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface BookingDetailsAccordionProps {
  booking: {
    status: BookingStatus;
    startAt: string;
    endAt: string;
    totalAmount: string | number;
    currency: string;
    cautionAmount?: string | number | null;
    listing: {
      type: string;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      seats?: number | null;
      doors?: number | null;
      luggage?: number | null;
      fuelType?: string | null;
      transmission?: string | null;
      options?: Record<string, unknown> | null;
      cancellationPolicy?: string | null;
    };
    payments?: Array<{
      status: string;
      amount: string | number;
      currency: string;
    }>;
  };
}

export function BookingDetailsAccordion({ booking }: BookingDetailsAccordionProps) {
  const t = useTranslations('booking.details');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['details', 'payment']));

  const toggleSection = (section: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(section)) {
      newOpen.delete(section);
    } else {
      newOpen.add(section);
    }
    setOpenSections(newOpen);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = () => {
    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalAmount = typeof booking.totalAmount === 'string' 
    ? parseFloat(booking.totalAmount) 
    : booking.totalAmount;
  const cautionAmount = booking.cautionAmount 
    ? (typeof booking.cautionAmount === 'string' 
        ? parseFloat(booking.cautionAmount) 
        : booking.cautionAmount)
    : null;

  const sections = [
    {
      id: 'details',
      title: t('title'),
      defaultOpen: true,
      content: (
        <div className="space-y-3 pt-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">{t('dates')}</dt>
            <dd className="mt-1">{formatDate(booking.startAt)} – {formatDate(booking.endAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">{t('duration')}</dt>
            <dd className="mt-1">{calculateDuration()} {calculateDuration() > 1 ? 'jours' : 'jour'}</dd>
          </div>
          {booking.listing.cancellationPolicy && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('latePolicy')}</dt>
              <dd className="mt-1 text-sm">{booking.listing.cancellationPolicy}</dd>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'vehicle',
      title: t('vehicle'),
      defaultOpen: false,
      content: (
        <div className="space-y-3 pt-2">
          {booking.listing.seats && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('specs')}</dt>
              <dd className="mt-1 text-sm">
                {booking.listing.seats} places
                {booking.listing.doors && ` • ${booking.listing.doors} portes`}
                {booking.listing.luggage && ` • ${booking.listing.luggage} bagages`}
              </dd>
            </div>
          )}
          {(booking.listing.fuelType || booking.listing.transmission) && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('fuel')}</dt>
              <dd className="mt-1 text-sm">
                {booking.listing.fuelType && `${booking.listing.fuelType}`}
                {booking.listing.transmission && ` • ${booking.listing.transmission}`}
              </dd>
            </div>
          )}
          {booking.listing.options && typeof booking.listing.options === 'object' && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('options')}</dt>
              <dd className="mt-1 text-sm">
                {Object.keys(booking.listing.options).length > 0
                  ? Object.keys(booking.listing.options).join(', ')
                  : t('none')}
              </dd>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'payment',
      title: t('payment'),
      defaultOpen: true,
      content: (
        <div className="space-y-3 pt-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">{t('priceDetails')}</dt>
            <dd className="mt-1 font-semibold">
              {totalAmount.toFixed(2)} {booking.currency}
            </dd>
          </div>
          {cautionAmount && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('caution')}</dt>
              <dd className="mt-1">{cautionAmount.toFixed(2)} {booking.currency}</dd>
            </div>
          )}
          {booking.payments && booking.payments.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('paymentStatus')}</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs ${
                  booking.payments[0].status === 'SUCCEEDED' 
                    ? 'bg-green-100 text-green-800' 
                    : booking.payments[0].status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {booking.payments[0].status}
                </span>
              </dd>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'insurance',
      title: t('insurance'),
      defaultOpen: false,
      content: (
        <div className="space-y-3 pt-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">{t('insuranceIncluded')}</dt>
            <dd className="mt-1 text-sm">{t('yes')}</dd>
          </div>
          {cautionAmount && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('deductible')}</dt>
              <dd className="mt-1 text-sm">{cautionAmount.toFixed(2)} {booking.currency}</dd>
            </div>
          )}
          {booking.listing.cancellationPolicy && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('cancellation')}</dt>
              <dd className="mt-1 text-sm">{booking.listing.cancellationPolicy}</dd>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      {sections.map((section) => {
        const isOpen = openSections.has(section.id);
        return (
          <div key={section.id} className="border-b border-border">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between py-4 text-left"
            >
              <span className="font-medium">{section.title}</span>
              <svg
                className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && <div className="pb-4">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
