'use client';

import { useTranslations } from 'next-intl';

type InsurancePolicy = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  pricePerDay?: number;
  imageUrl?: string;
};

type ReservationInsuranceBlockProps = {
  policies?: InsurancePolicy[];
  legacyInsurance?: {
    available: boolean;
    price?: number;
    description?: string;
  };
  selectedPolicyId: string | null;
  onPolicyChange: (policyId: string | null) => void;
  currency?: string;
  days: number;
};

function formatPrice(n: number, currency: string): string {
  return `${n.toFixed(2)} ${currency}`;
}

export function ReservationInsuranceBlock({
  policies,
  legacyInsurance,
  selectedPolicyId,
  onPolicyChange,
  currency = 'EUR',
  days,
}: ReservationInsuranceBlockProps) {
  const t = useTranslations('listing');
  const tReservation = useTranslations('reservation');

  const isLegacy = !Array.isArray(policies) || policies.length === 0;
  const available = isLegacy
    ? legacyInsurance?.available === true
    : policies && policies.length > 0;

  if (!available) return null;

  if (isLegacy && legacyInsurance) {
    const checked = !!selectedPolicyId;
    const price = legacyInsurance.price;
    const isIncluded = price == null || price === 0;

    return (
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
          checked
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
            : 'border-[var(--color-gray-light)] hover:border-[var(--color-primary)]/30'
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-gray-light)]/50">
          <svg
            className="h-5 w-5 text-[var(--color-gray-dark)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-[var(--color-black)]">
            {tReservation('options.insurance') || 'Assurance'}
          </span>
          {legacyInsurance.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-gray-dark)]">
              {legacyInsurance.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isIncluded ? (
            <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
              {t('included') || 'Inclus'}
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--color-black)]">
              {price != null ? `${formatPrice(price / days, currency)} / jour` : ''}
            </span>
          )}
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onPolicyChange(e.target.checked ? 'default' : null)}
            className="h-5 w-5 rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        </div>
      </label>
    );
  }

  const selectedPolicy = selectedPolicyId
    ? policies?.find((p) => p.id === selectedPolicyId)
    : null;
  if (!selectedPolicy && policies?.length) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-gray-dark)]">
          {tReservation('options.insurance') || 'Assurance'}
        </span>
        <select
          value={selectedPolicyId || ''}
          onChange={(e) => onPolicyChange(e.target.value || null)}
          className="w-full rounded-lg border border-[var(--color-gray-light)] bg-white px-3 py-2 text-sm"
        >
          <option value="">{tReservation('options.noInsurance') || 'Sans assurance'}</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (!selectedPolicy) return null;

  const price = selectedPolicy.price ?? selectedPolicy.pricePerDay;
  const isIncluded = price == null || price === 0;

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
        selectedPolicyId
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-[var(--color-gray-light)] hover:border-[var(--color-primary)]/30'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-gray-light)]/50">
        {selectedPolicy.imageUrl ? (
          <img
            src={selectedPolicy.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <svg
            className="h-5 w-5 text-[var(--color-gray-dark)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-[var(--color-black)]">
          {selectedPolicy.name}
        </span>
        {selectedPolicy.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-gray-dark)]">
            {selectedPolicy.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isIncluded ? (
          <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
            {t('included') || 'Inclus'}
          </span>
        ) : (
          <span className="text-sm font-medium text-[var(--color-black)]">
            {price != null
              ? `${formatPrice(typeof price === 'number' ? price / Math.max(1, days) : 0, currency)} / jour`
              : ''}
          </span>
        )}
        <input
          type="checkbox"
          checked={!!selectedPolicyId}
          onChange={(e) =>
            onPolicyChange(e.target.checked ? selectedPolicy.id : null)
          }
          className="h-5 w-5 rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
      </div>
    </label>
  );
}
