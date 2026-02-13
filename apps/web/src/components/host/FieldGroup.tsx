'use client';

import { ReactNode } from 'react';

type FieldGroupProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Component to group 2-3 fields maximum with consistent spacing
 * Supports optional title and description for better UX
 */
export function FieldGroup({ title, description, children, className = '' }: FieldGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="pb-3">
          {title && <h3 className="text-lg font-semibold text-black">{title}</h3>}
          {description && <p className="mt-1 text-xs text-neutral-600">{description}</p>}
        </div>
      )}
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}
