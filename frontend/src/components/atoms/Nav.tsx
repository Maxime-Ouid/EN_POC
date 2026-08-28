import type { ReactNode } from 'react';

export interface NavProps {
  children?: ReactNode;
}

export function Nav({ children }: NavProps) {
  return <nav className="nav">{children}</nav>;
}
