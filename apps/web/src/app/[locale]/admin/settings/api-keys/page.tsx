'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type SettingItem = {
  key: string;
  label: string;
  category: string;
  valueMasked: string;
  hasValue: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  google: 'Google',
  apple: 'Apple',
  smtp: 'SMTP (E-mails)',
};

export default function AdminApiKeysPage() {
  const t = useTranslations('admin.settings');
  const [items, setItems] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch('/admin/settings')
      .then((res) => res.json())
      .then((data: { items: SettingItem[] }) => {
        setItems(data.items ?? []);
        setValues({});
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = items.reduce<Record<string, SettingItem[]>>((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates = Object.entries(values).filter(([, v]) => v.trim().length > 0);
    if (updates.length === 0) {
      setMessage({ type: 'error', text: t('enterAtLeastOne') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          updates: updates.map(([key, value]) => ({ key, value: value.trim() })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message ?? t('saveError') });
        setSaving(false);
        return;
      }
      setMessage({ type: 'success', text: t('saved', { count: data.updated ?? updates.length }) });
      setValues({});
      const listRes = await apiFetch('/admin/settings');
      const listData = await listRes.json();
      setItems(listData.items ?? []);
    } catch {
      setMessage({ type: 'error', text: t('saveError') });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-6">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('apiKeysTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('apiKeysDescription')}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        {message && (
          <div
            className={`rounded-lg border p-4 ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}
          >
            {message.text}
          </div>
        )}

        {['stripe', 'google', 'apple', 'smtp'].map((category) => {
          const categoryItems = byCategory[category];
          if (!categoryItems?.length) return null;
          const categoryLabel = CATEGORY_LABELS[category] ?? category;
          return (
            <section key={category} className="rounded-lg border border-border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">{categoryLabel}</h2>
              <div className="space-y-4">
                {categoryItems.map((item) => (
                  <div key={item.key} className="flex flex-col gap-1">
                    <label htmlFor={item.key} className="text-sm font-medium text-foreground">
                      {item.label}
                    </label>
                    {item.hasValue && !values[item.key] && (
                      <p className="text-xs text-muted-foreground">
                        {t('currentValue')}: {item.valueMasked}
                      </p>
                    )}
                    <input
                      id={item.key}
                      type="password"
                      autoComplete="off"
                      placeholder={item.hasValue ? t('leaveBlankToKeep') : t('enterValue')}
                      value={values[item.key] ?? ''}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || Object.keys(values).length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
