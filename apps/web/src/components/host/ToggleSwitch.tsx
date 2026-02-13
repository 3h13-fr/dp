'use client';

import { useTranslations } from 'next-intl';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showLabel?: boolean;
  'aria-label'?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  showLabel = true,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  const t = useTranslations('createListing');
  const labelText = checked ? (t('yes') || 'Oui') : (t('no') || 'Non');
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? labelText}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-neutral-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </button>
      {showLabel && (
        <span className="text-sm text-neutral-700">{labelText}</span>
      )}
    </label>
  );
}
