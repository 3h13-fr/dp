'use client';

export function DisputeDetails({ dispute, bookingId }: { dispute: any; bookingId: string }) {
  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Dispute Details</h2>
      {dispute.logs && dispute.logs.length > 0 ? (
        <div className="space-y-4">
          {dispute.logs.map((log: any, index: number) => (
            <div key={log.id || index} className="rounded border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Reported: {new Date(log.createdAt).toLocaleString()}
              </p>
              {log.metadata && typeof log.metadata === 'object' && (log.metadata as any).message && (
                <p className="mt-2">{(log.metadata as any).message}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No dispute details available</p>
      )}
    </div>
  );
}
