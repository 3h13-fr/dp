'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type KycRow = {
  id: string;
  userId: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  reviewReason: string | null;
  createdAt: string;
  user: { id: string; email: string };
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

export default function AdminKycPage() {
  const locale = useLocale();
  const t = useTranslations('admin.kyc');
  const [data, setData] = useState<KycRow[] | null>(null);

  useEffect(() => {
    apiFetch('/admin/kyc-review')
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => setData(Array.isArray(body) ? body : []))
      .catch(() => setData([]));
  }, []);

  if (data === null) return <p className="text-muted-foreground">Loading...</p>;

  const rows = Array.isArray(data) ? data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t('noPending')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3">{t('name')}</th>
                <th className="p-3">{t('email')}</th>
                <th className="p-3">{t('requestDate')}</th>
                <th className="p-3">{t('reason')}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3">
                    {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="p-3">{row.user?.email ?? '—'}</td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{reasonLabel(row.reviewReason, t)}</td>
                  <td className="p-3">
                    <Link
                      href={`/${locale}/admin/kyc/${row.userId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {t('viewDetail')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
