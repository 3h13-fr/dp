'use client';

import { useTranslations } from 'next-intl';

type SearchCTAProps = {
  disabled: boolean;
  onClick: () => void;
  resultCount?: number;
};

export function SearchCTA({ disabled, onClick, resultCount }: SearchCTAProps) {
  const t = useTranslations('mobileSearch');

  return (
    <div className="sticky bottom-0 border-t border-neutral-200 bg-white p-4 safe-area-pb">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
          disabled
            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-ds-primary-hover'
        }`}
      >
        {resultCount !== undefined && resultCount > 0
          ? t('seeResults', { count: resultCount })
          : t('search')}
      </button>
    </div>
  );
}
