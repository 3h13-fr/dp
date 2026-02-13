'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function PayoutSection({
  payout,
  onUpdate,
}: {
  payout: any;
  onUpdate: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [reversing, setReversing] = useState(false);

  const handleForceProcess = async () => {
    if (!confirm('Force process this payout?')) return;
    setProcessing(true);
    try {
      await apiFetch(`/admin/payouts/${payout.id}/force-process`, { method: 'POST' });
      onUpdate();
    } catch (error) {
      alert('Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleReverse = async () => {
    const reason = prompt('Reason for reversal:');
    if (!reason) return;
    if (!confirm('Are you sure you want to reverse this payout?')) return;
    setReversing(true);
    try {
      await apiFetch(`/admin/payouts/${payout.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      onUpdate();
    } catch (error) {
      alert('Failed to reverse payout');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Host Payout</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="font-medium">
            {payout.totalAmount} {payout.currency}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Commission (15%)</p>
          <p className="font-medium">
            {payout.commissionAmount} {payout.currency}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Host Amount (85%)</p>
          <p className="font-medium">
            {payout.hostAmount} {payout.currency}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{payout.status}</p>
        </div>
        {payout.scheduledAt && (
          <div>
            <p className="text-sm text-muted-foreground">Scheduled At</p>
            <p className="font-medium">{new Date(payout.scheduledAt).toLocaleString()}</p>
          </div>
        )}
        {payout.paidAt && (
          <div>
            <p className="text-sm text-muted-foreground">Paid At</p>
            <p className="font-medium">{new Date(payout.paidAt).toLocaleString()}</p>
          </div>
        )}
        {payout.stripeTransferId && (
          <div>
            <p className="text-sm text-muted-foreground">Stripe Transfer ID</p>
            <p className="font-mono text-sm">{payout.stripeTransferId}</p>
          </div>
        )}
        <div className="flex gap-2 pt-4">
          {payout.status === 'SCHEDULED' && (
            <button
              onClick={handleForceProcess}
              disabled={processing}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Force Process'}
            </button>
          )}
          {payout.status === 'PAID' && (
            <button
              onClick={handleReverse}
              disabled={reversing}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {reversing ? 'Reversing...' : 'Reverse Transfer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
