'use client';

type MapToggleProps = {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function MapToggle({ isExpanded, onToggle, className = '' }: MapToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted shadow-sm ${className}`}
      aria-label={isExpanded ? 'Réduire la carte' : 'Agrandir la carte'}
    >
      {isExpanded ? (
        <>
          <span className="text-lg">◀</span>
          <span>Réduire</span>
        </>
      ) : (
        <>
          <span className="text-lg">▶</span>
          <span>Agrandir</span>
        </>
      )}
    </button>
  );
}
