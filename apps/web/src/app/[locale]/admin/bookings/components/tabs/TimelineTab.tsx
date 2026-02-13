'use client';

export function TimelineTab({ booking }: { booking: any }) {
  const events = booking.inspectionTimeline ?? [];

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-muted-foreground">No timeline events for this booking.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Timeline</h2>
      <div className="space-y-4">
        {events.map((event: any) => (
          <div key={event.id} className="flex gap-4 border-l-2 border-border pl-4">
            <div className="flex-1">
              <p className="font-medium">{event.eventType}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(event.createdAt).toLocaleString()}
              </p>
              {event.payload && Object.keys(event.payload).length > 0 && (
                <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
