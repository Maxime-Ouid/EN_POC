import type { ReactNode } from 'react';

export interface NavItemProps {
  icon: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  children?: ReactNode;
}

export function NavItem({ icon, active, count, onClick, children }: NavItemProps) {
  return (
    <div className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}>
      <svg className="icon">
        <use href={`#i-${icon}`} />
      </svg>
      {children}
      {typeof count === 'number' && <span className="badge">{count}</span>}
    </div>
  );
}
