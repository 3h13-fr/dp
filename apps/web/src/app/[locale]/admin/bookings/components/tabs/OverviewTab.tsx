'use client';

export function OverviewTab({ booking }: { booking: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold">Booking Information</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="font-medium">{booking.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Start Date</dt>
            <dd className="font-medium">{new Date(booking.startAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">End Date</dt>
            <dd className="font-medium">{new Date(booking.endAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Total Amount</dt>
            <dd className="font-medium">
              {booking.totalAmount} {booking.currency}
            </dd>
          </div>
          {booking.approvalDeadline && (
            <div>
              <dt className="text-sm text-muted-foreground">Approval Deadline</dt>
              <dd className="font-medium">{new Date(booking.approvalDeadline).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </div>

      {booking.listing && (
        <div className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Listing</h2>
          <p className="font-medium">{booking.listing.title || booking.listing.displayName || '—'}</p>
          <p className="text-sm text-muted-foreground">{booking.listing.type}</p>
        </div>
      )}

      {booking.guest && (
        <div className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Guest</h2>
          <p className="font-medium">
            {[booking.guest.firstName, booking.guest.lastName].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-sm text-muted-foreground">{booking.guest.email}</p>
        </div>
      )}

      {booking.host && (
        <div className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Host</h2>
          <p className="font-medium">
            {[booking.host.firstName, booking.host.lastName].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-sm text-muted-foreground">{booking.host.email}</p>
        </div>
      )}
    </div>
  );
}
