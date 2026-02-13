'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { PaymentSection } from '../payment-payout/PaymentSection';
import { PayoutSection } from '../payment-payout/PayoutSection';

export function PaymentPayoutTab({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [payout, setPayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch(`/admin/payments?bookingId=${bookingId}`)
        .then((res) => res.json())
        .then((data) => setPayments(data.items || [])),
      apiFetch(`/admin/payouts?bookingId=${bookingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.items && data.items.length > 0) {
            setPayout(data.items[0]);
          }
        }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <PaymentSection payments={payments} bookingId={bookingId} onUpdate={() => {
        apiFetch(`/admin/payments?bookingId=${bookingId}`)
          .then((res) => res.json())
          .then((data) => setPayments(data.items || []));
      }} />
      {payout && <PayoutSection payout={payout} onUpdate={() => {
        apiFetch(`/admin/payouts?bookingId=${bookingId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.items && data.items.length > 0) {
              setPayout(data.items[0]);
            }
          });
      }} />}
    </div>
  );
}
