'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type MarketRow = {
  id: string;
  countryCode: string;
  displayName: string;
  status: string;
  visibleToClient: boolean;
  bookingsAllowed: boolean;
  defaultCurrency: string | null;
  defaultLanguage: string | null;
  allowedLanguages: string[];
  policyLinks: { insurancePolicy: { id: string; name: string; insurer: { name: string } } }[];
  updatedAt: string;
};

export default function AdminMarketsPage() {
  const locale = useLocale();
  const t = useTranslations('admin.markets');
  const tNav = useTranslations('admin.nav');
  const [data, setData] = useState<{ items: MarketRow[]; total: number } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadMarkets = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '50');
    const q = params.toString() ? `?${params.toString()}` : '?limit=50';
    apiFetch(`/admin/markets${q}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  };

  useEffect(() => loadMarkets(), [search, statusFilter]);

  const handlePause = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    await apiFetch(`/admin/markets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    loadMarkets();
  };

  if (!data) return <p className="text-muted-foreground">{t('loading')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/markets/new`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('create')}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="ACTIVE">{t('statusActive')}</option>
          <option value="DRAFT">{t('statusDraft')}</option>
          <option value="PAUSED">{t('statusPaused')}</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('country')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('visible')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('bookingsAllowed')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('currency')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('languages')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('policies')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('updatedAt')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-medium">{m.displayName}</span>
                  <span className="ml-2 text-muted-foreground">({m.countryCode})</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      m.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : m.status === 'PAUSED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3">{m.visibleToClient ? 'Oui' : 'Non'}</td>
                <td className="px-4 py-3">{m.bookingsAllowed ? 'Oui' : 'Non'}</td>
                <td className="px-4 py-3">{m.defaultCurrency || '—'}</td>
                <td className="px-4 py-3">
                  {(Array.isArray(m.allowedLanguages) ? m.allowedLanguages : []).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  {m.policyLinks?.length ?? 0} {t('policiesCount')}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString(locale) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/${locale}/admin/markets/${m.id}`} className="mr-2 text-primary hover:underline">
                    {t('view')}
                  </Link>
                  <Link href={`/${locale}/admin/markets/${m.id}`} className="mr-2 text-primary hover:underline">
                    {t('edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handlePause(m.id, m.status)}
                    className="text-primary hover:underline"
                  >
                    {m.status === 'PAUSED' ? t('resume') : t('pause')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.items.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">{t('noMarkets')}</p>
      )}
    </div>
  );
}
