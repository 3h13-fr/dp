'use client';

import { useTranslations } from 'next-intl';

type ReservationSecondDriverBlockProps = {
  available: boolean;
  price?: number;
  checked: boolean;
  onToggle: (enabled: boolean) => void;
  currency?: string;
};

export function ReservationSecondDriverBlock({
  available,
  price = 0,
  checked,
  onToggle,
  currency = 'EUR',
}: ReservationSecondDriverBlockProps) {
  const t = useTranslations('listing');
  const tReservation = useTranslations('reservation');
  const isFree = price == null || price === 0;

  if (!available) return null;

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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-[var(--color-black)]">
          {tReservation('options.secondDriver') || 'Conducteur supplémentaire'}
        </span>
        <p className="mt-0.5 text-xs text-[var(--color-gray-dark)]">
          {tReservation('options.secondDriverDesc') || 'Ajouter un conducteur supplémentaire'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isFree ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t('free') || 'Gratuit'}
          </span>
        ) : (
          <span className="text-sm font-medium text-[var(--color-black)]">
            {price.toFixed(2)} {currency} / jour
          </span>
        )}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 rounded border-[var(--color-gray-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
      </div>
    </label>
  );
}
