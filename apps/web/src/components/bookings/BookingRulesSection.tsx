'use client';

import { useTranslations } from 'next-intl';

interface BookingRulesSectionProps {
  rules?: string[] | null;
  options?: Record<string, unknown> | null;
}

export function BookingRulesSection({ rules, options }: BookingRulesSectionProps) {
  const t = useTranslations('booking.rules');

  // Extract rules from options if available
  const vehicleRules: string[] = [];
  
  if (rules && Array.isArray(rules)) {
    vehicleRules.push(...rules);
  }

  // Extract common rules from options
  if (options) {
    if (options.noSmoking === true) {
      vehicleRules.push(t('noSmoking'));
    }
    if (options.noPets === true) {
      vehicleRules.push(t('noPets'));
    }
    if (options.minAge) {
      vehicleRules.push(t('minAge', { age: options.minAge }));
    }
  }

  // Default rule if none provided
  if (vehicleRules.length === 0) {
    vehicleRules.push(t('noSmoking')); // Default common rule
  }

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <h2 className="text-xl font-bold">{t('title')}</h2>

      <div>
        <p className="text-sm font-medium text-muted-foreground">{t('vehicleRules')}</p>
        <ul className="mt-2 space-y-2">
          {vehicleRules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-muted-foreground">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
