'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function DamageClaimSection({
  claim,
  bookingId,
  onUpdate,
}: {
  claim: any;
  bookingId: string;
  onUpdate: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [note, setNote] = useState('');

  const canDecide = claim.status === 'AWAITING_ADMIN_REVIEW';

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch(`/admin/claims/${claim.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note: note || undefined }),
      });
      if (res.ok) onUpdate();
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;
    setProcessing(true);
    try {
      const res = await apiFetch(`/admin/claims/${claim.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount, note: note || undefined }),
      });
      if (res.ok) onUpdate();
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch(`/admin/claims/${claim.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: note || undefined }),
      });
      if (res.ok) onUpdate();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Damage Claim — {claim.status}</h2>
      <dl className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted-foreground">Category</dt>
          <dd className="font-medium">{claim.category}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Amount requested</dt>
          <dd className="font-medium">{claim.amountRequested} {claim.booking?.currency ?? 'EUR'}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Submitted</dt>
          <dd className="font-medium">{claim.submittedAt ? new Date(claim.submittedAt).toLocaleString() : '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Renter response</dt>
          <dd className="font-medium">{claim.renterResponse ?? '—'}</dd>
        </div>
      </dl>
      <p className="mb-4 text-sm">{claim.justification}</p>

      <div className="mb-4 flex gap-4">
        {claim.departPhotoUrl && (
          <div>
            <p className="text-xs text-muted-foreground">Depart photo</p>
            <img src={claim.departPhotoUrl} alt="Depart" className="h-32 w-auto object-cover" />
          </div>
        )}
        {claim.returnPhotoUrl && (
          <div>
            <p className="text-xs text-muted-foreground">Return photo</p>
            <img src={claim.returnPhotoUrl} alt="Return" className="h-32 w-auto object-cover" />
          </div>
        )}
      </div>

      {canDecide && (
        <div className="mt-6 space-y-4 rounded border p-4">
          <h3 className="font-medium">Admin decision</h3>
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve (full amount)
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-24 rounded border px-2 py-2 text-sm"
              />
              <button
                onClick={handleAdjust}
                disabled={processing}
                className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Adjust (partial)
              </button>
            </div>
            <button
              onClick={handleReject}
              disabled={processing}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
