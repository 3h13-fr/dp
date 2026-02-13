'use client';

import { useTranslations } from 'next-intl';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/AddressAutocomplete';

type ReturnMethodEditorProps = {
  value: 'same' | 'different';
  onChange: (value: 'same' | 'different') => void;
  returnAddress?: string;
  onReturnAddressChange?: (address: string, suggestion?: AddressSuggestion) => void;
  onReturnAddressSelect?: (suggestion: AddressSuggestion) => void;
};

export function ReturnMethodEditor({ value, onChange, returnAddress, onReturnAddressChange, onReturnAddressSelect }: ReturnMethodEditorProps) {
  const t = useTranslations('createListing');

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
          <input
            type="radio"
            name="returnMethod"
            value="same"
            checked={value === 'same'}
            onChange={(e) => onChange(e.target.value as 'same')}
            className="h-4 w-4"
          />
          <div>
            <span className="font-medium">{t('returnSame')}</span>
            <p className="text-sm text-neutral-600">{t('returnSameDesc')}</p>
          </div>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
          <input
            type="radio"
            name="returnMethod"
            value="different"
            checked={value === 'different'}
            onChange={(e) => onChange(e.target.value as 'different')}
            className="h-4 w-4"
          />
          <div>
            <span className="font-medium">{t('returnDifferent')}</span>
            <p className="text-sm text-neutral-600">{t('returnDifferentDesc')}</p>
          </div>
        </label>
      </div>
      {value === 'different' && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            {t('returnAddress')}
          </label>
          <AddressAutocomplete
            value={returnAddress || ''}
            onChange={(address) => {
              if (onReturnAddressChange) {
                onReturnAddressChange(address);
              }
            }}
            onSelect={(suggestion) => {
              if (onReturnAddressChange) {
                onReturnAddressChange(suggestion.address, suggestion);
              }
              if (onReturnAddressSelect) {
                onReturnAddressSelect(suggestion);
              }
            }}
            placeholder={t('returnAddress')}
          />
        </div>
      )}
    </div>
  );
}
