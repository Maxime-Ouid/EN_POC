import type { ReactNode } from 'react';

export interface NavGroupProps {
  label: string;
  children?: ReactNode;
}

export function NavGroup({ label, children }: NavGroupProps) {
  return (
    <div className="nav-group">
      <div className="nav-label">{label}</div>
      {children}
    </div>
  );
}
