'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { FieldGroup } from '@/components/host/FieldGroup';
import { CountrySelect } from '@/components/admin/CountrySelect';

type Tab = 'identity' | 'locale' | 'payment' | 'taxes' | 'insurance' | 'seo';

type MarketDetail = {
  id: string;
  countryCode: string;
  displayName: string;
  status: string;
  visibleToClient: boolean;
  bookingsAllowed: boolean;
  defaultCurrency: string | null;
  defaultLanguage: string | null;
  allowedLanguages: string[];
  allowedCurrencies: string[];
  paymentProvider: string | null;
  paymentMethods: string[];
  commissionPercent: number | string | null;
  taxesEnabled: boolean;
  vatIncluded: boolean;
  defaultVatRate: number | string | null;
  invoiceLegalMention: string | null;
  seoIndexable: boolean;
  internalNote: string | null;
  policyLinks: { insurancePolicyId: string; isDefault: boolean; insurancePolicy: { id: string; name: string; insurer: { name: string } } }[];
  updatedAt: string;
};

type PolicyOption = { id: string; name: string; insurerName: string };

const MARKET_TABS: { id: Tab; label: string }[] = [
  { id: 'identity', label: 'Identité & statut' },
  { id: 'locale', label: 'Langues & devise' },
  { id: 'payment', label: 'Paiement & caution' },
  { id: 'taxes', label: 'Taxes & facturation' },
  { id: 'insurance', label: 'Assurances' },
  { id: 'seo', label: 'SEO' },
];

export default function AdminMarketEditPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin.markets');
  const id = String(params.id);
  const isNew = id === 'new';

  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [policies, setPolicies] = useState<PolicyOption[]>([]);

  const [form, setForm] = useState({
    countryCode: '',
    displayName: '',
    status: 'DRAFT' as string,
    visibleToClient: false,
    bookingsAllowed: false,
    defaultCurrency: '',
    defaultLanguage: '',
    allowedLanguages: [] as string[],
    allowedCurrencies: [] as string[],
    paymentProvider: 'Stripe',
    paymentMethods: [] as string[],
    commissionPercent: '',
    taxesEnabled: false,
    vatIncluded: true,
    defaultVatRate: '',
    invoiceLegalMention: '',
    seoIndexable: true,
    internalNote: '',
    policyIds: [] as string[],
    defaultPolicyId: null as string | null,
  });

  useEffect(() => {
    if (isNew) {
      setForm((f) => ({ ...f, allowedLanguages: ['fr'], allowedCurrencies: ['EUR'], paymentMethods: ['card', 'apple_pay', 'google_pay'] }));
      return;
    }
    setLoading(true);
    apiFetch(`/admin/markets/${id}`)
      .then((res) => res.json())
      .then((m: MarketDetail) => {
        setMarket(m);
        setForm({
          countryCode: m.countryCode,
          displayName: m.displayName,
          status: m.status,
          visibleToClient: m.visibleToClient,
          bookingsAllowed: m.bookingsAllowed,
          defaultCurrency: m.defaultCurrency ?? '',
          defaultLanguage: m.defaultLanguage ?? '',
          allowedLanguages: Array.isArray(m.allowedLanguages) ? m.allowedLanguages : [],
          allowedCurrencies: Array.isArray(m.allowedCurrencies) ? m.allowedCurrencies : [],
          paymentProvider: m.paymentProvider ?? 'Stripe',
          paymentMethods: Array.isArray(m.paymentMethods) ? m.paymentMethods : [],
          commissionPercent: m.commissionPercent != null ? String(m.commissionPercent) : '',
          taxesEnabled: m.taxesEnabled,
          vatIncluded: m.vatIncluded,
          defaultVatRate: m.defaultVatRate != null ? String(m.defaultVatRate) : '',
          invoiceLegalMention: m.invoiceLegalMention ?? '',
          seoIndexable: m.seoIndexable,
          internalNote: m.internalNote ?? '',
          policyIds: m.policyLinks?.map((l) => l.insurancePolicyId) ?? [],
          defaultPolicyId: m.policyLinks?.find((l) => l.isDefault)?.insurancePolicyId ?? null,
        });
      })
      .catch(() => setMarket(null))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    apiFetch('/insurance/policies')
      .then((r) => r.json())
      .then((data: { insurers?: Array<{ name: string; policies: Array<{ id: string; name: string }> }> }) => {
        const flat: PolicyOption[] = [];
        (data.insurers || []).forEach((ins) => {
          (ins.policies || []).forEach((p) => flat.push({ id: p.id, name: p.name, insurerName: ins.name }));
        });
        setPolicies(flat);
      })
      .catch(() => setPolicies([]));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        countryCode: form.countryCode.toUpperCase().trim(),
        displayName: form.displayName.trim(),
        status: form.status,
        visibleToClient: form.visibleToClient,
        bookingsAllowed: form.bookingsAllowed,
        defaultCurrency: form.defaultCurrency || null,
        defaultLanguage: form.defaultLanguage || null,
        allowedLanguages: form.allowedLanguages,
        allowedCurrencies: form.allowedCurrencies,
        paymentProvider: form.paymentProvider || null,
        paymentMethods: form.paymentMethods,
        commissionPercent: form.commissionPercent ? parseFloat(form.commissionPercent) : null,
        taxesEnabled: form.taxesEnabled,
        vatIncluded: form.vatIncluded,
        defaultVatRate: form.defaultVatRate ? parseFloat(form.defaultVatRate) : null,
        invoiceLegalMention: form.invoiceLegalMention || null,
        seoIndexable: form.seoIndexable,
        internalNote: form.internalNote || null,
        policyIds: form.policyIds,
        defaultPolicyId: form.defaultPolicyId,
      };
      if (isNew) {
        const res = await apiFetch('/admin/markets', { method: 'POST', body: JSON.stringify(payload) });
        const created = await res.json();
        router.push(`/${locale}/admin/markets/${created.id}`);
      } else {
        await apiFetch(`/admin/markets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        const res = await apiFetch(`/admin/markets/${id}`);
        setMarket(await res.json());
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }, [form, id, isNew, locale, router]);

  const handleDuplicate = useCallback(async () => {
    if (!market) return;
    try {
      const res = await apiFetch(`/admin/markets/${id}/duplicate`, { method: 'POST' });
      const dup = await res.json();
      router.push(`/${locale}/admin/markets/${dup.id}`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la duplication');
    }
  }, [id, market, locale, router]);

  if (loading) return <p className="text-muted-foreground">{t('loading')}</p>;
  if (!isNew && !market) {
    return (
      <div>
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Link href={`/${locale}/admin/markets`} className="mt-4 inline-block text-primary underline">
          ← {t('backToList')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <Link href={`/${locale}/admin/markets`} className="mb-4 inline-block text-sm text-primary hover:underline">
            ← {t('backToList')}
          </Link>
          <h2 className="mt-4 text-xl font-bold text-black">
            {isNew ? t('create') : `${t('edit')} : ${form.displayName || form.countryCode}`}
          </h2>
          <nav className="mt-4 space-y-0.5" aria-label="Navigation">
            {MARKET_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-neutral-100 text-black' : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          {!isNew && (
            <button
              type="button"
              onClick={handleDuplicate}
              className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50"
            >
              {t('duplicate')}
            </button>
          )}
        </aside>

        <main className="min-w-0">
          <div className="mb-4 lg:hidden">
            <Link href={`/${locale}/admin/markets`} className="mb-4 inline-block text-sm text-primary hover:underline">
              ← {t('backToList')}
            </Link>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">{isNew ? t('create') : t('edit')}</h1>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>

          <div className="lg:hidden mt-4 border-b border-neutral-200">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {MARKET_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                    activeTab === tab.id ? 'bg-neutral-200 text-black' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === 'identity' && (
              <div className="space-y-6">
                <FieldGroup title={t('identityTitle')} description={t('identityDesc')}>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium">{t('countryCode')}</span>
                      <div className="mt-1 max-w-[16rem]">
                        <CountrySelect
                          value={form.countryCode}
                          onChange={(code, label) =>
                            setForm((f) => ({
                              ...f,
                              countryCode: code,
                              displayName: f.displayName || label || code,
                            }))
                          }
                          disabled={!isNew}
                          placeholder="FR"
                          locale={locale}
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('displayName')}</span>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder="France"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('status')}</span>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      >
                        <option value="DRAFT">{t('statusDraft')}</option>
                        <option value="ACTIVE">{t('statusActive')}</option>
                        <option value="PAUSED">{t('statusPaused')}</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.visibleToClient}
                        onChange={(e) => setForm((f) => ({ ...f, visibleToClient: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{t('visibleToClient')}</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.bookingsAllowed}
                        onChange={(e) => setForm((f) => ({ ...f, bookingsAllowed: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{t('bookingsAllowed')}</span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('internalNote')}</span>
                      <textarea
                        value={form.internalNote}
                        onChange={(e) => setForm((f) => ({ ...f, internalNote: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                  </div>
                </FieldGroup>
              </div>
            )}

            {activeTab === 'locale' && (
              <div className="space-y-6">
                <FieldGroup title={t('localeTitle')} description={t('localeDesc')}>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium">{t('allowedLanguages')}</span>
                      <input
                        type="text"
                        value={form.allowedLanguages.join(', ')}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            allowedLanguages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          }))
                        }
                        placeholder="fr, en"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('defaultLanguage')}</span>
                      <input
                        type="text"
                        value={form.defaultLanguage}
                        onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
                        placeholder="fr"
                        className="mt-1 w-full max-w-[6rem] rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('allowedCurrencies')}</span>
                      <input
                        type="text"
                        value={form.allowedCurrencies.join(', ')}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            allowedCurrencies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          }))
                        }
                        placeholder="EUR, CHF"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('defaultCurrency')}</span>
                      <input
                        type="text"
                        value={form.defaultCurrency}
                        onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))}
                        placeholder="EUR"
                        className="mt-1 w-full max-w-[6rem] rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                  </div>
                </FieldGroup>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <FieldGroup title={t('paymentTitle')} description={t('paymentDesc')}>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium">{t('paymentProvider')}</span>
                      <input
                        type="text"
                        value={form.paymentProvider}
                        onChange={(e) => setForm((f) => ({ ...f, paymentProvider: e.target.value }))}
                        placeholder="Stripe"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('paymentMethods')}</span>
                      <input
                        type="text"
                        value={form.paymentMethods.join(', ')}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentMethods: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          }))
                        }
                        placeholder="card, apple_pay, google_pay, klarna"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                  </div>
                </FieldGroup>
              </div>
            )}

            {activeTab === 'taxes' && (
              <div className="space-y-6">
                <FieldGroup title={t('taxesTitle')} description={t('taxesDesc')}>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium">{t('commissionPercent')}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.commissionPercent}
                        onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))}
                        placeholder="15"
                        className="mt-1 w-full max-w-[8rem] rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.taxesEnabled}
                        onChange={(e) => setForm((f) => ({ ...f, taxesEnabled: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{t('taxesEnabled')}</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.vatIncluded}
                        onChange={(e) => setForm((f) => ({ ...f, vatIncluded: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{t('vatIncluded')}</span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('defaultVatRate')}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.defaultVatRate}
                        onChange={(e) => setForm((f) => ({ ...f, defaultVatRate: e.target.value }))}
                        placeholder="20"
                        className="mt-1 w-full max-w-[8rem] rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">{t('invoiceLegalMention')}</span>
                      <textarea
                        value={form.invoiceLegalMention}
                        onChange={(e) => setForm((f) => ({ ...f, invoiceLegalMention: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                      />
                    </label>
                  </div>
                </FieldGroup>
              </div>
            )}

            {activeTab === 'insurance' && (
              <div className="space-y-6">
                <FieldGroup title={t('insuranceTitle')} description={t('insuranceDesc')}>
                  {form.bookingsAllowed && form.policyIds.length === 0 && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {t('insuranceWarning')}
                    </div>
                  )}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">{t('selectPolicies')}</span>
                    <ul className="space-y-2 rounded-lg border border-border p-3">
                      {policies.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.policyIds.includes(p.id)}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                policyIds: f.policyIds.includes(p.id)
                                  ? f.policyIds.filter((id) => id !== p.id)
                                  : [...f.policyIds, p.id],
                                defaultPolicyId: f.policyIds.includes(p.id) && f.defaultPolicyId === p.id ? null : f.defaultPolicyId,
                              }))
                            }
                            className="h-4 w-4"
                          />
                          <input
                            type="radio"
                            name="defaultPolicy"
                            checked={form.defaultPolicyId === p.id}
                            onChange={() => setForm((f) => ({ ...f, defaultPolicyId: p.id }))}
                            disabled={!form.policyIds.includes(p.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{p.name}</span>
                          <span className="text-xs text-muted-foreground">({p.insurerName})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FieldGroup>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-6">
                <FieldGroup title={t('seoTitle')} description={t('seoDesc')}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.seoIndexable}
                      onChange={(e) => setForm((f) => ({ ...f, seoIndexable: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{t('seoIndexable')}</span>
                  </label>
                  {!form.seoIndexable && (
                    <p className="text-sm text-muted-foreground">{t('seoOffWarning')}</p>
                  )}
                </FieldGroup>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
