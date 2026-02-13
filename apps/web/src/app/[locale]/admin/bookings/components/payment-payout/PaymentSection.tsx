'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

function OverrideAmountForm({
  paymentId,
  currentAmount,
  onSave,
  onCancel,
}: {
  paymentId: string;
  currentAmount: number;
  onSave: (amount: number, reason: string) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(currentAmount);
  const [reason, setReason] = useState('');

  return (
    <div className="mt-4 rounded bg-muted p-4">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        className="mb-2 w-full rounded border border-border bg-background px-2 py-1"
        placeholder="New amount"
      />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mb-2 w-full rounded border border-border bg-background px-2 py-1"
        placeholder="Reason"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(amount, reason || 'Admin override')}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PaymentSection({
  payments,
  bookingId,
  onUpdate,
}: {
  payments: any[];
  bookingId: string;
  onUpdate: () => void;
}) {
  const [refunding, setRefunding] = useState<string | null>(null);
  const [overrideAmount, setOverrideAmount] = useState<{ paymentId: string; amount: number } | null>(null);

  const handleRefund = async (paymentId: string, amount?: number) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    setRefunding(paymentId);
    try {
      await apiFetch(`/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason: 'Admin refund' }),
      });
      onUpdate();
    } catch (error) {
      alert('Failed to refund payment');
    } finally {
      setRefunding(null);
    }
  };

  const handleOverrideAmount = async (paymentId: string, newAmount: number, reason: string) => {
    try {
      await apiFetch(`/admin/payments/${paymentId}/override-amount`, {
        method: 'POST',
        body: JSON.stringify({ amount: newAmount, reason }),
      });
      onUpdate();
      setOverrideAmount(null);
    } catch (error) {
      alert('Failed to override amount');
    }
  };

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Payments</h2>
      {payments.length === 0 ? (
        <p className="text-muted-foreground">No payments found</p>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {payment.amount} {payment.currency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {payment.type} · Status: {payment.status}
                  </p>
                  {payment.stripePaymentId && (
                    <p className="text-xs text-muted-foreground">Stripe: {payment.stripePaymentId}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {payment.status === 'SUCCEEDED' && (
                    <>
                      <button
                        onClick={() => handleRefund(payment.id)}
                        disabled={refunding === payment.id}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {refunding === payment.id ? 'Refunding...' : 'Refund'}
                      </button>
                      <button
                        onClick={() => setOverrideAmount({ paymentId: payment.id, amount: payment.amount })}
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                      >
                        Override Amount
                      </button>
                    </>
                  )}
                  {payment.status === 'FAILED' && (
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/admin/payments/${payment.id}/retry`, { method: 'POST' });
                          onUpdate();
                        } catch {
                          alert('Failed to retry payment');
                        }
                      }}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
              {overrideAmount?.paymentId === payment.id && (
                <OverrideAmountForm
                  paymentId={payment.id}
                  currentAmount={overrideAmount.amount}
                  onSave={(amount, reason) => {
                    handleOverrideAmount(payment.id, amount, reason);
                  }}
                  onCancel={() => setOverrideAmount(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
