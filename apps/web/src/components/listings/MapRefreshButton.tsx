'use client';

type MapRefreshButtonProps = {
  onClick: () => void;
  className?: string;
};

export function MapRefreshButton({ onClick, className = '' }: MapRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg hover:opacity-90 ${className}`}
    >
      Actualiser la recherche dans cette zone
    </button>
  );
}
