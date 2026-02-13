'use client';

import { useState, ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

/**
 * Collapsible section for advanced/optional fields
 * Hidden by default to reduce cognitive load
 */
export function CollapsibleSection({
  title,
  description,
  children,
  defaultExpanded = false,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border-t border-neutral-200 pt-4 ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-neutral-900">{title}</p>
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
        </div>
        <svg
          className={`h-5 w-5 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-4 space-y-0 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
