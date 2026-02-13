'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';
import { FullScreenModal } from './FullScreenModal';

type DestinationScreenProps = {
  open: boolean;
  onClose: () => void;
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
  allowedCountryCodes?: string[];
};

export function DestinationScreen({ open, onClose, value, onSelect, allowedCountryCodes }: DestinationScreenProps) {
  const t = useTranslations('mobileSearch');
  const [searchValue, setSearchValue] = useState(value?.address || '');
  const [error, setError] = useState<string | null>(null);

  // Reset search value and error when modal opens
  useEffect(() => {
    if (open) {
      setSearchValue(value?.address || '');
      setError(null);
    }
  }, [open, value]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setSearchValue('');
    setError(null);
    onClose();
  };

  const handleError = (errorMessage: string | null) => {
    setError(errorMessage);
  };

  const handleRetry = () => {
    setError(null);
    setSearchValue('');
  };

  return (
    <FullScreenModal open={open} onClose={onClose} title={t('selectDestination')}>
      <div className="flex flex-col h-full">
        {/* Sticky search input */}
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white p-4">
          <AddressAutocomplete
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSelect}
            onError={handleError}
            placeholder={t('selectDestination')}
            className="w-full"
            inputClassName="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            hideInlineError={true}
            allowedCountryCodes={allowedCountryCodes && allowedCountryCodes.length > 0 ? allowedCountryCodes : undefined}
          />
        </div>

        {/* Content area - shows error or empty state */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-neutral-600 mb-4">{t('errorLoading')}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-50"
              >
                {t('retry')}
              </button>
            </div>
          ) : !searchValue ? (
            <div className="text-sm text-neutral-500 text-center py-8">
              {t('selectDestination')}
            </div>
          ) : null}
        </div>
      </div>
    </FullScreenModal>
  );
}
