'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useKycModal } from '@/contexts/KycModalContext';
import { BookingHeader } from '@/components/bookings/BookingHeader';
import { BookingSummaryCard } from '@/components/bookings/BookingSummaryCard';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingActions } from '@/components/bookings/BookingActions';
import { BookingDetailsAccordion } from '@/components/bookings/BookingDetailsAccordion';
import { BookingDocuments } from '@/components/bookings/BookingDocuments';
import { BookingHostCard } from '@/components/bookings/BookingHostCard';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { BookingHeroSection } from '@/components/bookings/BookingHeroSection';
import { BookingReservationDetails } from '@/components/bookings/BookingReservationDetails';
import { BookingOwnerSection } from '@/components/bookings/BookingOwnerSection';
import { BookingRulesSection } from '@/components/bookings/BookingRulesSection';
import { BookingLocationSection } from '@/components/bookings/BookingLocationSection';
import { BookingHelpSection } from '@/components/bookings/BookingHelpSection';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS';

interface Booking {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  totalAmount: string | number;
  currency: string;
  cautionAmount?: string | number | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  listing: {
    id: string;
    slug?: string;
    title?: string | null;
    displayName?: string | null;
    type: string;
    photos?: Array<{ url: string; order?: number }>;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    seats?: number | null;
    doors?: number | null;
    luggage?: number | null;
    fuelType?: string | null;
    transmission?: string | null;
    options?: Record<string, unknown> | null;
    cancellationPolicy?: string | null;
  };
  guest: {
    firstName: string | null;
    lastName: string | null;
  };
  host: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl?: string | null;
    kycStatus?: string | null;
  };
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  payments?: Array<{
    id: string;
    status: string;
    amount: string | number;
    currency: string;
  }>;
}

function LeaveReviewForm({
  bookingId,
  onSubmitted,
  t,
  submitting,
  setSubmitting,
}: {
  bookingId: string;
  onSubmitted: (review: { id: string; rating: number; comment: string | null; createdAt: string }) => void;
  t: (key: string) => string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/bookings/${bookingId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        onSubmitted({
          id: data.id,
          rating: data.rating,
          comment: data.comment ?? null,
          createdAt: data.createdAt,
        });
        alert(t('reviewSubmitted'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold">{t('leaveReview')}</h2>
      <div className="mt-3">
        <label className="block text-sm font-medium text-muted-foreground">{t('rating')}</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="mt-1 w-full max-w-[8rem] rounded-lg border border-border bg-white px-3 py-2 text-sm"
          data-testid="review-rating-select"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3">
        <label className="block text-sm font-medium text-muted-foreground">{t('comment')}</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          rows={3}
          data-testid="review-comment-input"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        data-testid="review-submit-button"
      >
        {submitting ? t('submittingReview') : t('submitReview')}
      </button>
    </form>
  );
}

export default function BookingDetailPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { openKyc } = useKycModal();
  const id = String(params.id);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    apiFetch(`/bookings/${id}`)
      .then((r) => (r.status === 404 ? null : r.json()))
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => {
        setBooking(null);
        setLoading(false);
      });
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => setKycStatus(user?.kycStatus ?? null))
      .catch(() => setKycStatus(null));
  }, [id, ready]);

  const t = useTranslations('booking');
  const tKyc = useTranslations('kyc');
  const isConfirmedBooking =
    booking?.status === 'CONFIRMED' || booking?.status === 'IN_PROGRESS' || booking?.status === 'COMPLETED';

  const handleStatusChange = () => {
    // Recharger les données après changement de statut
    apiFetch(`/bookings/${id}`)
      .then((r) => (r.status === 404 ? null : r.json()))
      .then((data) => setBooking(data))
      .catch(() => {});
  };

  if (!ready) return null;
  if (loading) return <p className="px-4 py-8 text-muted-foreground">{t('common.loading')}</p>;
  if (!booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-muted-foreground">{locale === 'fr' ? 'Réservation introuvable.' : 'Booking not found.'}</p>
        <Link href={`/${locale}/bookings`} className="mt-4 inline-block text-primary underline">
          ← {t('myTrips')}
        </Link>
      </div>
    );
  }

  // Extract daily distance from options
  const dailyDistance = booking.listing.options?.maxMileagePerDay 
    ? (typeof booking.listing.options.maxMileagePerDay === 'number' 
        ? booking.listing.options.maxMileagePerDay 
        : parseInt(String(booking.listing.options.maxMileagePerDay), 10))
    : booking.listing.options?.dailyDistance
    ? (typeof booking.listing.options.dailyDistance === 'number'
        ? booking.listing.options.dailyDistance
        : parseInt(String(booking.listing.options.dailyDistance), 10))
    : null;

  // Extract rules from options
  const vehicleRules = booking.listing.options?.usageConditions 
    ? (Array.isArray(booking.listing.options.usageConditions) 
        ? booking.listing.options.usageConditions 
        : [String(booking.listing.options.usageConditions)])
    : null;

  // Check if host is verified (KYC approved) - fallback to false if not available
  const isHostVerified = booking.host.kycStatus === 'APPROVED' || false;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Breadcrumb */}
      <div className="hidden border-b border-border bg-background px-6 py-4 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${locale}/bookings`} className="hover:text-foreground">
              {t('myTrips')}
            </Link>
            <span>/</span>
            <span className="text-foreground">Réservation #{booking.id.slice(0, 8)}</span>
          </nav>
          <div className="flex items-center gap-4">
            <BookingStatusBadge status={booking.status} />
            <Link
              href={`/${locale}/messages?bookingId=${booking.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {t('message')}
            </Link>
          </div>
        </div>
      </div>

      {/* KYC Warning */}
      {isConfirmedBooking && kycStatus !== 'APPROVED' && (
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800">{tKyc('kycRequired')}</p>
            <button
              type="button"
              onClick={() => openKyc(true)}
              className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {tKyc('goToKyc')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content - New Layout */}
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
        {/* Left Column - Main Content */}
        <div className="divide-y divide-border">
          {/* Hero Section - Image + Title + Dates + Quick Actions */}
          <BookingHeroSection
            listing={booking.listing}
            startAt={booking.startAt}
            endAt={booking.endAt}
            bookingId={booking.id}
          />

          {/* Reservation Details */}
          <div className="border-t border-border">
            <BookingReservationDetails
              bookingId={booking.id}
              cautionAmount={booking.cautionAmount}
              currency={booking.currency}
              dailyDistance={dailyDistance}
              cancellationPolicy={booking.listing.cancellationPolicy}
            />
          </div>

          {/* Owner Section */}
          <div className="border-t border-border">
            <BookingOwnerSection
              host={booking.host}
              bookingId={booking.id}
              isVerified={isHostVerified}
              isProfessional={false} // TODO: Add professional status check
            />
          </div>

          {/* Rules Section */}
          <div className="border-t border-border">
            <BookingRulesSection
              rules={vehicleRules}
              options={booking.listing.options}
            />
          </div>

          {/* Location Section */}
          <div className="border-t border-border">
            <BookingLocationSection
              city={booking.listing.city}
              country={booking.listing.country}
              latitude={booking.listing.latitude}
              longitude={booking.listing.longitude}
            />
          </div>

          {/* Help Section */}
          <div className="border-t border-border">
            <BookingHelpSection />
          </div>

          {/* Additional Sections - Timeline, Documents, Review */}
          <div className="space-y-6 px-4 py-6 lg:px-6 border-t border-border">
            {/* Timeline */}
            <BookingTimeline booking={booking} />

            {/* Documents */}
            <BookingDocuments booking={booking} />

            {/* Review Section - Completed bookings */}
            {booking.status === 'COMPLETED' && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                {booking.review ? (
                  <>
                    <h2 className="text-lg font-semibold">{t('yourReview')}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('rating')}: {booking.review.rating}/5
                      {booking.review.comment && (
                        <>
                          <br />
                          {booking.review.comment}
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <LeaveReviewForm
                    bookingId={booking.id}
                    onSubmitted={(review) => setBooking((b) => (b ? { ...b, review } : null))}
                    t={t}
                    submitting={submittingReview}
                    setSubmitting={setSubmittingReview}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Desktop Sidebar (sticky) */}
        <div className="hidden lg:block">
          <div className="sticky top-4 space-y-6 px-6">
            <BookingStatusBadge status={booking.status} className="w-full justify-center" />
            <BookingActions booking={booking} onStatusChange={handleStatusChange} />
            <BookingSummaryCard booking={booking} />
            <BookingHostCard host={booking.host} bookingId={booking.id} />
          </div>
        </div>
      </div>

      {/* Mobile Actions - Sticky bottom bar */}
      <div className="sticky bottom-0 z-20 border-t border-border bg-background px-4 py-3 shadow-lg lg:hidden">
        <BookingActions booking={booking} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
