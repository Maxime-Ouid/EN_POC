import type { ReactNode } from 'react';

export interface SidebarProps {
  children?: ReactNode;
}

// Conteneur latéral fixe, 236px — §6.14. Pas de repli mobile dans le design
// system d'origine (dette notée en §7 point 5) : à traiter si l'app doit être
// utilisable sur petit écran.
export function Sidebar({ children }: SidebarProps) {
  return <aside className="sidebar">{children}</aside>;
}
