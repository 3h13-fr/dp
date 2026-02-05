'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type KycDetail = {
  id: string;
  userId: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  documentType: string | null;
  idDocUrl: string | null;
  idDocBackUrl: string | null;
  reviewReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
};

function reasonLabel(reason: string | null, t: (k: string) => string): string {
  if (!reason) return '—';
  switch (reason) {
    case 'DOUBTFUL': return t('reasonDoubtful');
    case 'MISMATCH': return t('reasonMismatch');
    case 'ILLEGIBLE': return t('reasonIllegible');
    case 'SUSPECTED_FRAUD': return t('reasonFraud');
    default: return reason;
  }
}

export default function AdminKycDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin.kyc');
  const userId = String(params.userId);
  const [kyc, setKyc] = useState<KycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/admin/kyc/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setKyc)
      .catch(() => setKyc(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleStatus = async (status: 'APPROVED' | 'REJECTED') => {
    setError(null);
    setUpdating(true);
    try {
      const res = await apiFetch(`/admin/kyc/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(status === 'REJECTED' && rejectReason.trim() ? { rejectionReason: rejectReason.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Update failed');
      }
      router.replace(`/${locale}/admin/kyc`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!kyc) {
    return (
      <div>
        <p className="text-muted-foreground">KYC not found.</p>
        <Link href={`/${locale}/admin/kyc`} className="mt-4 inline-block text-primary underline">
          ← Back to list
        </Link>
      </div>
    );
  }

  if (kyc.status !== 'PENDING_REVIEW') {
    return (
      <div>
        <p className="text-muted-foreground">This KYC is not pending review (status: {kyc.status}).</p>
        <Link href={`/${locale}/admin/kyc`} className="mt-4 inline-block text-primary underline">
          ← Back to list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/${locale}/admin/kyc`} className="text-sm text-primary hover:underline">
        ← Back to list
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t('detailTitle')}</h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{t('identity')}</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div><dt className="inline font-medium text-muted-foreground">Name: </dt><dd className="inline">{[kyc.firstName, kyc.lastName].filter(Boolean).join(' ') || '—'}</dd></div>
          <div><dt className="inline font-medium text-muted-foreground">Email: </dt><dd className="inline">{kyc.user?.email ?? '—'}</dd></div>
          <div><dt className="inline font-medium text-muted-foreground">Date of birth: </dt><dd className="inline">{kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="inline font-medium text-muted-foreground">Nationality: </dt><dd className="inline">{kyc.nationality ?? '—'}</dd></div>
          <div><dt className="inline font-medium text-muted-foreground">Document type: </dt><dd className="inline">{kyc.documentType ?? '—'}</dd></div>
          <div><dt className="inline font-medium text-muted-foreground">Review reason: </dt><dd className="inline">{reasonLabel(kyc.reviewReason, t)}</dd></div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{t('documentFront')}</h2>
        {kyc.idDocUrl ? (
          <a href={kyc.idDocUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
            <img src={kyc.idDocUrl} alt="ID front" className="max-h-64 rounded border border-border object-contain" />
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">—</p>
        )}
      </section>
      {kyc.idDocBackUrl && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">{t('documentBack')}</h2>
          <a href={kyc.idDocBackUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
            <img src={kyc.idDocBackUrl} alt="ID back" className="max-h-64 rounded border border-border object-contain" />
          </a>
        </section>
      )}

      <section className="mt-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">{t('rejectionReason')}</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-1 rounded border border-border px-3 py-2 text-sm"
            placeholder={locale === 'fr' ? 'Optionnel' : 'Optional'}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={updating}
            onClick={() => handleStatus('APPROVED')}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {updating ? t('updating') : t('approve')}
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => handleStatus('REJECTED')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {updating ? t('updating') : t('reject')}
          </button>
        </div>
      </section>
    </div>
  );
}
