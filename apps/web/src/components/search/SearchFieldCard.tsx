'use client';

type SearchFieldCardProps = {
  label: string;
  value: string | null;
  placeholder: string;
  onClick: () => void;
  isEmpty?: boolean;
};

export function SearchFieldCard({ label, value, placeholder, onClick, isEmpty = false }: SearchFieldCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        isEmpty
          ? 'border-neutral-200 bg-white hover:border-neutral-300'
          : 'border-neutral-300 bg-white hover:border-neutral-400'
      }`}
    >
      <div className="text-xs font-semibold text-neutral-600">{label}</div>
      <div className={`mt-1 text-sm ${value ? 'font-medium text-black' : 'text-neutral-400'}`}>
        {value || placeholder}
      </div>
    </button>
  );
}
