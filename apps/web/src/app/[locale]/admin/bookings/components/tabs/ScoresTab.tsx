'use client';

export function ScoresTab({ booking }: { booking: any }) {
  const scorings = booking.scorings ?? [];
  const latest = scorings[0];

  if (!latest) {
    return (
      <div className="rounded-lg border border-border p-6">
        <p className="text-muted-foreground">No scores computed for this booking.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Scores (aide à la décision)</h2>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {latest.inspectionQualityScore != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Inspection quality</dt>
            <dd className="text-2xl font-bold">{latest.inspectionQualityScore}/100</dd>
          </div>
        )}
        {latest.hostReliabilityScore != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Host reliability</dt>
            <dd className="text-2xl font-bold">{latest.hostReliabilityScore}/100</dd>
          </div>
        )}
        {latest.renterReliabilityScore != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Renter reliability</dt>
            <dd className="text-2xl font-bold">{latest.renterReliabilityScore}/100</dd>
          </div>
        )}
        {latest.claimConfidenceScore != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Claim confidence</dt>
            <dd className="text-2xl font-bold">{latest.claimConfidenceScore}/100</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Computed at: {new Date(latest.computedAt).toLocaleString()}
      </p>
    </div>
  );
}
