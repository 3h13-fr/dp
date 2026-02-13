'use client';

import { useTranslations } from 'next-intl';

type PickupMethodEditorProps = {
  value: 'handover' | 'keybox';
  onChange: (value: 'handover' | 'keybox') => void;
  keyboxCode?: string;
  onKeyboxCodeChange?: (code: string) => void;
};

export function PickupMethodEditor({ value, onChange, keyboxCode, onKeyboxCodeChange }: PickupMethodEditorProps) {
  const t = useTranslations('createListing');

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
        <input
          type="radio"
          name="pickupMethod"
          value="handover"
          checked={value === 'handover'}
          onChange={(e) => onChange(e.target.value as 'handover')}
          className="h-4 w-4"
        />
        <div>
          <span className="font-medium">{t('pickupHandover')}</span>
          <p className="text-sm text-neutral-600">{t('pickupHandoverDesc')}</p>
        </div>
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
        <input
          type="radio"
          name="pickupMethod"
          value="keybox"
          checked={value === 'keybox'}
          onChange={(e) => onChange(e.target.value as 'keybox')}
          className="h-4 w-4"
        />
        <div>
          <span className="font-medium">{t('pickupKeybox')}</span>
          <p className="text-sm text-neutral-600">{t('pickupKeyboxDesc')}</p>
        </div>
      </label>
      {value === 'keybox' && keyboxCode !== undefined && onKeyboxCodeChange && (
        <div className="mt-4 pl-7">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            {t('keyboxCode') || 'Code du boîtier'}
          </label>
          <input
            type="text"
            value={keyboxCode ?? ''}
            onChange={(e) => onKeyboxCodeChange(e.target.value)}
            placeholder={t('keyboxCodePlaceholder') || 'Ex: 1234'}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
