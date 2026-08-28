import type { ReactNode } from 'react';

export interface SubscreenProps {
  active: boolean;
  children?: ReactNode;
}

// Panneau associé à un onglet — n'affiche ses enfants que si `active` (évite de
// monter le contenu des onglets inactifs, contrairement au prototype qui se
// contentait de masquer en CSS).
export function Subscreen({ active, children }: SubscreenProps) {
  if (!active) return null;
  return <div className="subscreen is-active">{children}</div>;
}
