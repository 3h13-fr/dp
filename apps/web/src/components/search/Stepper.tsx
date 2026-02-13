'use client';

type StepperProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, min = 0, max, onChange }: StepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (max === undefined || value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-black">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-neutral-400 hover:bg-neutral-50"
          aria-label={`Diminuer ${label}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="min-w-[2rem] text-center text-base font-medium text-black">{value}</span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-neutral-400 hover:bg-neutral-50"
          aria-label={`Augmenter ${label}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
