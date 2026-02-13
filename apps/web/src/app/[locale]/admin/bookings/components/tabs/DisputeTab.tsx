'use client';

import { DamageClaimSection } from '../dispute/DamageClaimSection';

export function DisputeTab({ booking, onRefresh }: { booking: any; onRefresh?: () => void }) {
  const claims = booking.damageClaims ?? [];

  const onUpdate = () => onRefresh?.();

  if (claims.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-muted-foreground">No damage claim for this booking.</p>
        {booking.listing?.type !== 'CAR_RENTAL' && (
          <p className="mt-2 text-sm text-muted-foreground">
            Damage claims are only for CAR_RENTAL bookings.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {claims.map((claim: any) => (
        <DamageClaimSection key={claim.id} claim={claim} bookingId={booking.id} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
