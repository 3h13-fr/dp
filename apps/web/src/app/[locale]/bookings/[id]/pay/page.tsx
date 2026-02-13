'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiFetch } from '@/lib/api';
import { getListingTitle } from '@/lib/listings';
import { BookingPaySummary } from '@/components/listings/BookingPaySummary';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function PaymentForm({ clientSecret, bookingId, totalAmount, currency, onSuccess }: {
  clientSecret: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/bookings/${bookingId}` },
    });
    if (submitError) setError(submitError.message ?? 'Payment failed');
    else onSuccess();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="rounded-lg bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay ${totalAmount} ${currency}`}
      </button>
    </form>
  );
}

type BookingState = {
  id: string;
  totalAmount: string;
  currency: string;
  status: string;
  startAt: string;
  endAt: string;
  cautionAmount?: string | null;
  listing: {
    id: string;
    slug?: string | null;
    title?: string | null;
    displayName?: string | null;
    displayTitle?: string | null;
    type?: string;
    photos?: Array<{ url: string; order?: number }>;
  };
};

export default function PayPage() {
  const { ready } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = String(params.id);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    apiFetch(`/bookings/${id}`)
      .then((r) => r.json())
      .then((b) => {
        setBooking(b);
        if (b.status === 'PENDING' && b.totalAmount) {
          return apiFetch('/payments/create-payment-intent', {
            method: 'POST',
            body: JSON.stringify({
              bookingId: b.id,
              type: 'booking',
              amount: parseFloat(b.totalAmount),
              currency: b.currency || 'EUR',
            }),
          }).then((r) => r.json());
        }
        return null;
      })
      .then((data) => data?.clientSecret && setClientSecret(data.clientSecret))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [id, ready]);

  if (!ready) return null;
  if (loading || !booking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        {loading ? <p>Loading...</p> : <p>Booking not found.</p>}
        <Link href={`/${locale}/location`} className="mt-4 inline-block text-primary underline">Back to listings</Link>
      </div>
    );
  }

  const totalAmount = parseFloat(booking.totalAmount);
  const currency = booking.currency || 'EUR';

  if (booking.status !== 'PENDING' || totalAmount <= 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Booking {booking.id}</h1>
        <p className="mt-2 text-muted-foreground">
          {booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
            ? 'This booking is already paid or confirmed.'
            : 'No payment required.'}
        </p>
        <Link href={`/${locale}/bookings`} className="mt-4 inline-block text-primary underline">My bookings</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,400px]">
        <div>
          <h1 className="text-2xl font-bold">Complete payment</h1>
          <p className="mt-1 text-muted-foreground">{booking.listing ? getListingTitle(booking.listing) : '—'}</p>
          <p className="mt-2 font-medium">Total: {totalAmount} {currency}</p>
          {stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <PaymentForm
                clientSecret={clientSecret}
                bookingId={booking.id}
                totalAmount={totalAmount}
                currency={currency}
                onSuccess={() => router.push(`/${locale}/bookings/${booking.id}`)}
              />
            </Elements>
          ) : (
            <div className="mt-4">
              {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                <p className="text-muted-foreground">Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
              ) : (
                <p className="text-muted-foreground">Preparing payment form...</p>
              )}
              <Link href={`/${locale}/bookings/${booking.id}`} className="mt-2 inline-block text-primary underline">Back to booking</Link>
            </div>
          )}
        </div>
        <div className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
          <BookingPaySummary booking={booking} />
        </div>
      </div>
    </div>
  );
}
