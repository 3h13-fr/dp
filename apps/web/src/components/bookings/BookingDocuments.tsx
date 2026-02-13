'use client';

import { useTranslations } from 'next-intl';

interface BookingDocumentsProps {
  booking: {
    id: string;
    checkInAt?: string | null;
    checkOutAt?: string | null;
  };
}

export function BookingDocuments({ booking }: BookingDocumentsProps) {
  const t = useTranslations('booking.documents');

  // Pour l'instant, structure UI seulement (backend à implémenter)
  const documents = {
    inspection: {
      label: t('inspection'),
      status: booking.checkInAt ? 'complete' : 'missing',
      photos: booking.checkInAt ? ['photo1.jpg', 'photo2.jpg'] : [],
    },
    contract: {
      label: t('contract'),
      status: 'complete' as const,
      url: '#contract',
    },
    requiredDocs: {
      label: t('requiredDocs'),
      status: 'complete' as const,
      items: ['Permis de conduire', 'Carte d\'identité'],
    },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      
      {/* État des lieux */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{documents.inspection.label}</h3>
            {documents.inspection.photos.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {documents.inspection.photos.length} photo(s)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {documents.inspection.status === 'complete' ? (
              <>
                <span className="text-green-600">✔</span>
                <span className="text-sm text-green-600">{t('complete')}</span>
              </>
            ) : (
              <>
                <span className="text-amber-600">⚠</span>
                <span className="text-sm text-amber-600">{t('missing')}</span>
              </>
            )}
          </div>
        </div>
        {documents.inspection.status === 'missing' && (
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('upload')} {documents.inspection.label}
          </button>
        )}
      </div>

      {/* Contrat */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{documents.contract.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Document disponible</p>
          </div>
          <a
            href={documents.contract.url}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('download')}
          </a>
        </div>
      </div>

      {/* Documents requis */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{documents.requiredDocs.label}</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {documents.requiredDocs.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">✔</span>
            <span className="text-sm text-green-600">{t('complete')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
