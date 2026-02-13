'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

type Insurer = { id: string; name: string; status: string; _count?: { policies: number } };
type Policy = {
  id: string;
  name: string;
  status: string;
  eligibilityCriteria: Record<string, unknown>;
  details: Record<string, unknown>;
};

const defaultEligibility = {
  vehicleYearMin: null as number | null,
  vehicleYearMax: null as number | null,
  minDriverAge: null as number | null,
  minLicenseYears: null as number | null,
  fiscalPowerMin: null as number | null,
  fiscalPowerMax: null as number | null,
  allowedCountries: [] as string[],
  registrationCountries: [] as string[],
  ownerTypes: [] as string[],
  secondaryDriverAllowed: null as boolean | null,
};

const defaultDetails = {
  cautionAmount: null as number | null,
  assistance0km: null as boolean | null,
  roadsideAssistance: null as boolean | null,
  personalEffectsProtection: null as boolean | null,
  compensationCeiling: null as number | null,
  minRentalDays: null as number | null,
  maxRentalDays: null as number | null,
};

export default function AdminInsurancePage() {
  const t = useTranslations('admin.nav');
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsurerId, setSelectedInsurerId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [insurerForm, setInsurerForm] = useState<{ name: string; status: string } | null>(null);
  const [policyForm, setPolicyForm] = useState<{
    name: string;
    eligibilityCriteria: typeof defaultEligibility;
    details: typeof defaultDetails;
  } | null>(null);
  const [policyEditId, setPolicyEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadInsurers = useCallback(() => {
    apiFetch('/admin/insurance/insurers')
      .then((r) => r.json())
      .then((data: { items: Insurer[] }) => setInsurers(data.items || []))
      .catch(() => setInsurers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInsurers();
  }, [loadInsurers]);

  useEffect(() => {
    if (!selectedInsurerId) {
      setPolicies([]);
      return;
    }
    apiFetch(`/admin/insurance/insurers/${selectedInsurerId}/policies`)
      .then((r) => r.json())
      .then((data: Policy[]) => setPolicies(Array.isArray(data) ? data : []))
      .catch(() => setPolicies([]));
  }, [selectedInsurerId]);

  const createInsurer = async () => {
    if (!insurerForm?.name.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/admin/insurance/insurers', {
        method: 'POST',
        body: JSON.stringify(insurerForm),
      });
      setInsurerForm(null);
      loadInsurers();
    } finally {
      setSaving(false);
    }
  };

  const updateInsurer = async (id: string, body: { name?: string; status?: string }) => {
    setSaving(true);
    try {
      await apiFetch(`/admin/insurance/insurers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      loadInsurers();
    } finally {
      setSaving(false);
    }
  };

  const deleteInsurer = async (id: string) => {
    if (!confirm('Supprimer cet assureur et toutes ses polices ?')) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/insurance/insurers/${id}`, { method: 'DELETE' });
      if (selectedInsurerId === id) setSelectedInsurerId(null);
      loadInsurers();
    } finally {
      setSaving(false);
    }
  };

  const createPolicy = async () => {
    if (!selectedInsurerId || !policyForm?.name.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/insurance/insurers/${selectedInsurerId}/policies`, {
        method: 'POST',
        body: JSON.stringify({
          name: policyForm.name,
          eligibilityCriteria: policyForm.eligibilityCriteria,
          details: policyForm.details,
        }),
      });
      setPolicyForm(null);
      apiFetch(`/admin/insurance/insurers/${selectedInsurerId}/policies`)
        .then((r) => r.json())
        .then((data: Policy[]) => setPolicies(Array.isArray(data) ? data : []));
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = async (id: string) => {
    if (!policyForm) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/insurance/policies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: policyForm.name,
          eligibilityCriteria: policyForm.eligibilityCriteria,
          details: policyForm.details,
        }),
      });
      setPolicyForm(null);
      setPolicyEditId(null);
      if (selectedInsurerId)
        apiFetch(`/admin/insurance/insurers/${selectedInsurerId}/policies`)
          .then((r) => r.json())
          .then((data: Policy[]) => setPolicies(Array.isArray(data) ? data : []));
    } finally {
      setSaving(false);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm('Supprimer cette police ?')) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/insurance/policies/${id}`, { method: 'DELETE' });
      if (selectedInsurerId)
        apiFetch(`/admin/insurance/insurers/${selectedInsurerId}/policies`)
          .then((r) => r.json())
          .then((data: Policy[]) => setPolicies(Array.isArray(data) ? data : []));
    } finally {
      setSaving(false);
    }
  };

  const openEditPolicy = (p: Policy) => {
    setPolicyEditId(p.id);
    setPolicyForm({
      name: p.name,
      eligibilityCriteria: { ...defaultEligibility, ...(p.eligibilityCriteria || {}) } as typeof defaultEligibility,
      details: { ...defaultDetails, ...(p.details || {}) } as typeof defaultDetails,
    });
  };

  if (loading) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('insurance')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Assureurs et polices d&apos;assurance.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assureurs</h2>
            <button
              type="button"
              onClick={() => setInsurerForm({ name: '', status: 'ACTIVE' })}
              className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            >
              + Ajouter
            </button>
          </div>
          {insurerForm && (
            <div className="mt-2 flex gap-2 rounded-lg border border-border p-3">
              <input
                type="text"
                value={insurerForm.name}
                onChange={(e) => setInsurerForm((f) => (f ? { ...f, name: e.target.value } : null))}
                placeholder="Nom assureur"
                className="flex-1 rounded border border-border px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={createInsurer}
                disabled={saving || !insurerForm.name.trim()}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                Créer
              </button>
              <button type="button" onClick={() => setInsurerForm(null)} className="rounded border px-3 py-1.5 text-sm">
                Annuler
              </button>
            </div>
          )}
          <ul className="mt-3 space-y-1 rounded-lg border border-border">
            {insurers.map((i) => (
              <li
                key={i.id}
                className={`flex items-center justify-between border-b border-border p-3 last:border-b-0 ${selectedInsurerId === i.id ? 'bg-muted/50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedInsurerId(i.id)}
                  className="text-left font-medium"
                >
                  {i.name}
                </button>
                <span className="text-xs text-muted-foreground">{i._count?.policies ?? 0} polices</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => deleteInsurer(i.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Suppr.
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {selectedInsurerId ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Polices</h2>
                <button
                  type="button"
                  onClick={() => {
                    setPolicyEditId(null);
                    setPolicyForm({
                      name: '',
                      eligibilityCriteria: defaultEligibility,
                      details: defaultDetails,
                    });
                  }}
                  className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                >
                  + Ajouter une police
                </button>
              </div>
              {policyForm && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-4">
                  <input
                    type="text"
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm((f) => (f ? { ...f, name: e.target.value } : null))}
                    placeholder="Nom de la police"
                    className="w-full rounded border border-border px-2 py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label>Année véhicule min</label>
                    <input
                      type="number"
                      value={policyForm.eligibilityCriteria.vehicleYearMin ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                eligibilityCriteria: {
                                  ...f.eligibilityCriteria,
                                  vehicleYearMin: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Année véhicule max</label>
                    <input
                      type="number"
                      value={policyForm.eligibilityCriteria.vehicleYearMax ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                eligibilityCriteria: {
                                  ...f.eligibilityCriteria,
                                  vehicleYearMax: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Âge conducteur min</label>
                    <input
                      type="number"
                      value={policyForm.eligibilityCriteria.minDriverAge ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                eligibilityCriteria: {
                                  ...f.eligibilityCriteria,
                                  minDriverAge: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Années de permis min</label>
                    <input
                      type="number"
                      value={policyForm.eligibilityCriteria.minLicenseYears ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                eligibilityCriteria: {
                                  ...f.eligibilityCriteria,
                                  minLicenseYears: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Caution (€)</label>
                    <input
                      type="number"
                      value={policyForm.details.cautionAmount ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                details: {
                                  ...f.details,
                                  cautionAmount: e.target.value ? parseFloat(e.target.value) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Location min (jours)</label>
                    <input
                      type="number"
                      value={policyForm.details.minRentalDays ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                details: {
                                  ...f.details,
                                  minRentalDays: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                    <label>Location max (jours)</label>
                    <input
                      type="number"
                      value={policyForm.details.maxRentalDays ?? ''}
                      onChange={(e) =>
                        setPolicyForm((f) =>
                          f
                            ? {
                                ...f,
                                details: {
                                  ...f.details,
                                  maxRentalDays: e.target.value ? parseInt(e.target.value, 10) : null,
                                },
                              }
                            : null
                        )
                      }
                      className="rounded border px-2 py-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    {policyEditId ? (
                      <button
                        type="button"
                        onClick={() => updatePolicy(policyEditId)}
                        disabled={saving}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        Enregistrer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={createPolicy}
                        disabled={saving || !policyForm.name.trim()}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        Créer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyForm(null);
                        setPolicyEditId(null);
                      }}
                      className="rounded border px-3 py-1.5 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              <ul className="mt-3 space-y-1 rounded-lg border border-border">
                {policies.map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b border-border p-3 last:border-b-0">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPolicy(p)}
                        className="text-sm text-primary hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePolicy(p.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Suppr.
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">Sélectionnez un assureur pour gérer ses polices.</p>
          )}
        </div>
      </div>
    </div>
  );
}
