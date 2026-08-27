import type { ReactNode } from 'react';

export interface BadgeProps {
  children?: ReactNode;
}

// Petit compteur rond (ex. nombre de dossiers dans la nav, questions dans un onglet).
export function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>;
}
