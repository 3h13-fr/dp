'use client';

import { useTranslations } from 'next-intl';

type StepProgressBarProps = {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
};

const STEP_LABELS = [
  'Type d\'offre',
  'Mode véhicule',
  'Identification',
  'Options',
  'Localisation',
  'Tarification',
  'Disponibilité',
  'Règles',
  'Aperçu',
  'Photos',
];

export function StepProgressBar({ currentStep, totalSteps, completedSteps = [], onStepClick }: StepProgressBarProps) {
  const t = useTranslations('createListing');

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isActive = step === currentStep;
          const isCompleted = completedSteps.includes(step);
          const isClickable = isCompleted && onStepClick;

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step)}
                  disabled={!isClickable}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground scale-110'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white cursor-pointer hover:scale-105'
                        : 'border-border bg-background text-muted-foreground'
                  } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={`Step ${step}`}
                >
                  {isCompleted && !isActive ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{step}</span>
                  )}
                </button>
                <span className={`mt-2 text-xs text-center max-w-[80px] ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`}>
                  {STEP_LABELS[step - 1] || `Étape ${step}`}
                </span>
              </div>
              {step < totalSteps && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  step < currentStep || completedSteps.includes(step + 1)
                    ? 'bg-green-500'
                    : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
