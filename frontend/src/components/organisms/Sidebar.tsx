import type { ReactNode } from 'react';

export interface SidebarProps {
  children?: ReactNode;
}

// Conteneur latéral fixe, largeur --nav-w — §6.14. Se replie en rail d'icônes
// (62px) à la demande, et de lui-même sous 1024px : le bouton vit dans
// SidebarBrand, l'état dans theme/useNavCollapse.ts.
export function Sidebar({ children }: SidebarProps) {
  return <aside className="sidebar">{children}</aside>;
}
