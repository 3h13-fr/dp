'use client';

import { useTranslations } from 'next-intl';
import { calculateListingPrice, type ListingForPricing } from '@/lib/pricing';

type PriceBreakdownProps = {
  startAt: string;
  endAt: string;
  listing: ListingForPricing;
  insurancePrice: number;
  guaranteesPrice: number;
  currency: string;
  showDetails?: boolean;
  onToggleDetails?: () => void;
};

export function PriceBreakdown({
  startAt,
  endAt,
  listing,
  insurancePrice,
  guaranteesPrice,
  currency,
  showDetails = false,
  onToggleDetails,
}: PriceBreakdownProps) {
  const t = useTranslations('checkout');
  const formatPrice = (n: number) => `${n.toFixed(2)} ${currency}`;

  const priceCalculation = (() => {
    if (!startAt || !endAt) return null;
    return calculateListingPrice(startAt, endAt, listing);
  })();

  if (!priceCalculation) return null;

  const subtotal = priceCalculation.finalPrice ?? 0;
  const total = subtotal + insurancePrice + guaranteesPrice;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-black)]">
          {t('priceDetail') || 'Détail du prix'}
        </h3>
        {onToggleDetails && (
          <button
            type="button"
            onClick={onToggleDetails}
            className="text-sm underline text-[var(--color-gray-dark)] hover:text-[var(--color-black)]"
          >
            {showDetails ? (t('hideDetails') || 'Masquer') : (t('priceDetail') || 'Détail du prix')}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 text-sm text-[var(--color-gray-dark)]">
          {priceCalculation.discount > 0 ? (
            <>
              <div className="flex justify-between">
                <span>
                  {priceCalculation.isHourly
                    ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                    : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('nights', { count: priceCalculation.days })}`}
                </span>
                <span>{formatPrice(priceCalculation.basePrice)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-primary)]">
                <span>
                  {t('discountApplied', { percent: priceCalculation.discount }) || `Remise ${priceCalculation.discount}%`}
                </span>
                <span>-{formatPrice(priceCalculation.basePrice - priceCalculation.finalPrice)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span>
                {priceCalculation.isHourly
                  ? `${formatPrice(priceCalculation.basePrice / priceCalculation.hours)} × ${priceCalculation.hours} ${t('hours') || 'h'}`
                  : `${formatPrice(priceCalculation.basePrice / priceCalculation.days)} × ${t('nights', { count: priceCalculation.days })}`}
              </span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          )}
          {insurancePrice > 0 && (
            <div className="flex justify-between">
              <span>{t('insurance') || 'Assurance'}</span>
              <span>{formatPrice(insurancePrice)}</span>
            </div>
          )}
          {guaranteesPrice > 0 && (
            <div className="flex justify-between">
              <span>{t('guarantees') || 'Garanties'}</span>
              <span>{formatPrice(guaranteesPrice)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--color-gray-light)] pt-3">
        <span className="font-bold text-[var(--color-black)]">
          {t('totalEur') || 'Total EUR'}
        </span>
        <span className="font-bold text-[var(--color-black)]">
          {formatPrice(total)}
        </span>
      </div>
    </div>
  );
}
