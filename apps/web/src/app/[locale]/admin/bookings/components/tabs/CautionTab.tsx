'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function CautionTab({ booking, onRefresh }: { booking: any; onRefresh?: () => void }) {
  const deposit = booking.deposit;
  const [capturing, setCapturing] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [captureAmount, setCaptureAmount] = useState<string>('');

  if (!deposit) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-muted-foreground">No deposit for this booking.</p>
      </div>
    );
  }

  const payment = deposit.payment;
  const canCapture = deposit.status === 'PREAUTHORIZED' && payment?.status === 'PENDING';
  const canRelease = deposit.status === 'PREAUTHORIZED' && payment?.status === 'PENDING';
  const maxAmount = payment?.amount ? Number(payment.amount) : 0;

  const handleCapture = async () => {
    if (!deposit.id) return;
    setCapturing(true);
    try {
      const amount = captureAmount ? parseFloat(captureAmount) : undefined;
      const res = await apiFetch(`/admin/deposits/${deposit.id}/capture`, {
        method: 'POST',
        body: JSON.stringify(amount != null ? { amount } : {}),
      });
      if (res.ok) {
        onRefresh?.();
      }
    } finally {
      setCapturing(false);
    }
  };

  const handleRelease = async () => {
    if (!deposit.id) return;
    setReleasing(true);
    try {
      const res = await apiFetch(`/admin/deposits/${deposit.id}/release`, {
        method: 'POST',
      });
      if (res.ok) {
        onRefresh?.();
      }
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold">Deposit status</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="font-medium">{deposit.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Amount</dt>
            <dd className="font-medium">{payment?.amount} {payment?.currency}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Payment status</dt>
            <dd className="font-medium">{payment?.status}</dd>
          </div>
        </dl>

        {(canCapture || canRelease) && (
          <div className="mt-6 flex flex-wrap gap-4">
            {canCapture && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Amount (optional)"
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(e.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                  min={0}
                  max={maxAmount}
                  step={0.01}
                />
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {capturing ? 'Capturing...' : 'Capture'}
                </button>
              </div>
            )}
            {canRelease && (
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="rounded border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {releasing ? 'Releasing...' : 'Release'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
