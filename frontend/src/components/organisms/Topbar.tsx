import type { ReactNode } from 'react';

export interface TopbarProps {
  children?: ReactNode;
}

export function Topbar({ children }: TopbarProps) {
  return <header className="topbar">{children}</header>;
}
