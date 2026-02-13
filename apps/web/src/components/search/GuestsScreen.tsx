'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SearchBottomSheet } from '@/components/SearchBottomSheet';
import { Stepper } from './Stepper';

type GuestsScreenProps = {
  open: boolean;
  onClose: () => void;
  adults: number;
  children: number;
  onSelect: (adults: number, children: number) => void;
};

export function GuestsScreen({ open, onClose, adults, children, onSelect }: GuestsScreenProps) {
  const t = useTranslations('mobileSearch');
  const [localAdults, setLocalAdults] = useState(adults || 1);
  const [localChildren, setLocalChildren] = useState(children || 0);

  // Reset values when modal opens
  useEffect(() => {
    if (open) {
      setLocalAdults(adults || 1);
      setLocalChildren(children || 0);
    }
  }, [open, adults, children]);

  const totalGuests = localAdults + localChildren;
  const summary =
    localChildren > 0
      ? `${localAdults} ${t('adults')}, ${localChildren} ${t('children')}`
      : `${totalGuests} ${t('guests')}`;

  const handleDone = () => {
    onSelect(localAdults, localChildren);
    onClose();
  };

  return (
    <SearchBottomSheet open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">{t('selectGuests')}</h2>

        <div className="divide-y divide-neutral-200">
          <Stepper
            label={t('adults')}
            value={localAdults}
            min={1}
            onChange={setLocalAdults}
          />
          <Stepper
            label={t('children')}
            value={localChildren}
            min={0}
            onChange={setLocalChildren}
          />
        </div>

        {summary && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-sm font-medium text-black">{summary}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleDone}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-ds-primary-hover transition-colors"
        >
          {t('done')}
        </button>
      </div>
    </SearchBottomSheet>
  );
}
