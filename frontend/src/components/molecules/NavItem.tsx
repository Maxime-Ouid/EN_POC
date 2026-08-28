import type { ReactNode } from 'react';

export interface NavItemProps {
  icon: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  /** Rubrique porteuse d'un sous-menu : affiche un chevron à droite. */
  expandable?: boolean;
  /** État du chevron (sans effet si `expandable` est faux). */
  expanded?: boolean;
  children?: ReactNode;
}

export function NavItem({
  icon,
  active,
  count,
  onClick,
  expandable,
  expanded,
  children,
}: NavItemProps) {
  return (
    <div className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}>
      <svg className="icon">
        <use href={`#i-${icon}`} />
      </svg>
      {children}
      {typeof count === 'number' && <span className="badge">{count}</span>}
      {/* Le chevron indique un sous-menu ; il ne remplace pas le badge, les deux
          peuvent coexister (« Dossiers » porte un compteur ET des sous-entrées). */}
      {expandable && (
        <svg className={expanded ? 'nav-chev open' : 'nav-chev'} aria-hidden="true">
          <use href="#i-chevr" />
        </svg>
      )}
    </div>
  );
}
