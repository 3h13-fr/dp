'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function DisputeActions({ bookingId }: { bookingId: string }) {
  const [processing, setProcessing] = useState(false);

  const handleManualRefund = async () => {
    const amount = prompt('Refund amount:');
    if (!amount) return;
    const reason = prompt('Reason:');
    if (!reason) return;

    // First get the payment
    try {
      const paymentsRes = await apiFetch(`/admin/payments?bookingId=${bookingId}`);
      const paymentsData = await paymentsRes.json();
      const payment = paymentsData.items?.find((p: any) => p.type === 'booking' && p.status === 'SUCCEEDED');

      if (!payment) {
        alert('No succeeded payment found');
        return;
      }

      setProcessing(true);
      await apiFetch(`/admin/payments/${payment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount), reason }),
      });
      alert('Refund processed');
    } catch (error) {
      alert('Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Admin Actions</h2>
      <div className="flex gap-2">
        <button
          onClick={handleManualRefund}
          disabled={processing}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Manual Refund'}
        </button>
      </div>
    </div>
  );
}
