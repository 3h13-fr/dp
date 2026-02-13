'use client';

import { useTranslations } from 'next-intl';

type CompletionCheck = {
  id: string;
  label: string;
  completed: boolean;
};

type ListingCompletionIndicatorProps = {
  checks: CompletionCheck[];
  onToggleActivation?: () => void;
  canActivate: boolean;
};

/**
 * Component to show listing completion status with checklist
 * Displays percentage and missing fields
 */
export function ListingCompletionIndicator({
  checks,
  onToggleActivation,
  canActivate,
}: ListingCompletionIndicatorProps) {
  const t = useTranslations('hostNav');
  const completedCount = checks.filter((c) => c.completed).length;
  const totalCount = checks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const missingChecks = checks.filter((c) => !c.completed);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-black">Complétion de l'annonce</h3>
          <p className="text-xs text-neutral-600 mt-1">
            {completedCount} sur {totalCount} critères remplis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-neutral-200"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - percentage / 100)}`}
                className={`transition-all duration-300 ${
                  percentage === 100 ? 'text-green-500' : percentage >= 80 ? 'text-yellow-500' : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-semibold ${
                percentage === 100 ? 'text-green-600' : percentage >= 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2 mb-4">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center gap-2 text-sm">
            {check.completed ? (
              <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-neutral-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={check.completed ? 'text-neutral-700' : 'text-neutral-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {/* Activation status */}
      {canActivate ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-sm font-medium text-green-800">
            ✓ L'annonce peut être activée
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            ⚠️ L'annonce ne peut pas être activée
          </p>
          {missingChecks.length > 0 && (
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
              {missingChecks.map((check) => (
                <li key={check.id}>{check.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
