'use client';

export function InspectionsTab({ booking }: { booking: any }) {
  const inspections = booking.inspections ?? [];

  if (inspections.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-muted-foreground">No inspections for this booking.</p>
        {booking.listing?.type !== 'CAR_RENTAL' && (
          <p className="mt-2 text-sm text-muted-foreground">
            Inspections are only required for CAR_RENTAL bookings.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inspections.map((insp: any) => (
        <div key={insp.id} className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Inspection {insp.type} — {insp.status}
          </h2>
          <dl className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Mode</dt>
              <dd className="font-medium">{insp.mode}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created by</dt>
              <dd className="font-medium">{insp.createdBy}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Mileage</dt>
              <dd className="font-medium">{insp.mileageValue ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Energy level</dt>
              <dd className="font-medium">{insp.energyLevelPercent != null ? `${insp.energyLevelPercent}%` : '—'}</dd>
            </div>
            {insp.validatedAt && (
              <div>
                <dt className="text-sm text-muted-foreground">Validated at</dt>
                <dd className="font-medium">{new Date(insp.validatedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
          {insp.items?.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium">Items</h3>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {insp.items.map((item: any) => (
                  <div key={item.id} className="rounded border p-3">
                    <p className="text-sm font-medium">{item.itemCode}</p>
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt={item.itemCode}
                        className="mt-2 h-20 w-full object-cover"
                      />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Condition: {item.conditionStatus} | Cleanliness: {item.cleanlinessLevel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
