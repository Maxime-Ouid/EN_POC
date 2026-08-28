import type { ReactNode } from 'react';

export interface NavGroupProps {
  /** Intitulé de section. Omis, le groupe n'affiche aucun titre (navigation V1). */
  label?: string;
  children?: ReactNode;
}

export function NavGroup({ label, children }: NavGroupProps) {
  return (
    <div className="nav-group">
      {label && <div className="nav-label">{label}</div>}
      {children}
    </div>
  );
}
