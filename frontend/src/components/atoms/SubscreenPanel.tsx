import type { ReactNode } from 'react';

export interface SubscreenPanelProps {
  active: boolean;
  /** Niveau de sous-écran : 2 = onglets Statistiques, 3 = onglets Personnalisation. */
  level: 2 | 3;
  children?: ReactNode;
}

// Panneau d'onglet de second/troisième niveau (.subscreen2 / .subscreen3). Les
// classes existent séparément dans components.css car le prototype imbriquait
// trois familles d'onglets sans portée CSS.
export function SubscreenPanel({ active, level, children }: SubscreenPanelProps) {
  if (!active) return null;
  return <div className={`subscreen${level} is-active`}>{children}</div>;
}
