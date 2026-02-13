'use client';

import { useState, useEffect } from 'react';

type DiscountGroupProps = {
  label: string;
  days: number;
  enabled: boolean;
  percentage: number | null;
  basePrice: number;
  onToggle: (enabled: boolean) => void;
  onPercentageChange: (percentage: number | null) => void;
  minPercentage?: number; // Minimum percentage from previous discount
  maxPercentage?: number; // Maximum allowed percentage
};

/**
 * Component for a discount group (J+3, J+7, J+30)
 * Shows toggle, percentage input, and calculated final price
 */
export function DiscountGroup({
  label,
  days,
  enabled,
  percentage,
  basePrice,
  onToggle,
  onPercentageChange,
  minPercentage = 0,
  maxPercentage = 100,
}: DiscountGroupProps) {
  const [localPercentage, setLocalPercentage] = useState<number>(percentage ?? 0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setLocalPercentage(percentage ?? 0);
  }, [percentage]);

  const calculatedPrice = enabled && localPercentage > 0
    ? basePrice * (1 - localPercentage / 100)
    : basePrice;

  const handlePercentageChange = (value: number) => {
    setLocalPercentage(value);
    
    // Validation
    if (value < minPercentage) {
      setError(`La remise doit être d'au moins ${minPercentage}%`);
      return;
    }
    if (value > maxPercentage) {
      setError(`La remise ne peut pas dépasser ${maxPercentage}%`);
      return;
    }
    
    setError('');
    onPercentageChange(value);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-200"
            />
            <span className="text-sm font-semibold text-black">{label}</span>
          </label>
          <p className="mt-1 text-xs text-neutral-600">
            Remise applicable à partir de {days} jours de location
          </p>
        </div>
      </div>

      {enabled && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Remise (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={minPercentage}
                max={maxPercentage}
                step="0.1"
                value={localPercentage}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handlePercentageChange(value);
                }}
                className="w-24 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                placeholder="0"
              />
              <span className="text-sm text-neutral-600">%</span>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            {minPercentage > 0 && !error && (
              <p className="mt-1 text-xs text-neutral-500">
                Minimum : {minPercentage}%
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white border border-neutral-200 p-3">
            <p className="text-xs text-neutral-600 mb-1">Prix journalier final</p>
            <p className="text-lg font-semibold text-black">
              {calculatedPrice.toFixed(2)} € / jour
            </p>
            {localPercentage > 0 && (
              <p className="mt-1 text-xs text-green-600">
                Économie : {((basePrice - calculatedPrice) * days).toFixed(2)} € sur {days} jours
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
