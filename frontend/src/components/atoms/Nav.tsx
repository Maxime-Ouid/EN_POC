import type { ReactNode } from 'react';

export interface NavProps {
  children?: ReactNode;
  /** Désigné par `aria-controls` du bouton de repli — voir SidebarBrand. */
  id?: string;
}

export function Nav({ children, id }: NavProps) {
  return (
    <nav className="nav" id={id}>
      {children}
    </nav>
  );
}
