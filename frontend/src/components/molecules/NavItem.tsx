import { positionNavTooltip } from '../atoms/navTooltip';
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

// Entrée de navigation de premier niveau. Rendue comme un <button> et non comme
// une <div> cliquable : le prototype d'origine utilisait une <div>, qui n'a ni
// curseur de pointeur, ni focus clavier, ni sémantique pour un lecteur d'écran.
// Même correction que celle déjà faite sur PresetCard.
export function NavItem({
  icon,
  active,
  count,
  onClick,
  expandable,
  expanded,
  children,
}: NavItemProps) {
  // En mode « icônes seules », le libellé devient une infobulle en
  // position:fixed ; elle a besoin de savoir où se trouve l'entrée survolée.
  const locate = (e: { currentTarget: HTMLElement }) => positionNavTooltip(e.currentTarget);

  return (
    <button
      type="button"
      className={active ? 'nav-item active' : 'nav-item'}
      aria-current={active ? 'page' : undefined}
      aria-expanded={expandable ? expanded : undefined}
      onClick={onClick}
      onMouseEnter={locate}
      onFocus={locate}
    >
      <svg className="icon">
        <use href={`#i-${icon}`} />
      </svg>
      {/* Le libellé porte sa propre classe : le mode « icônes seules » le sort
          du rail pour en faire une infobulle, sans toucher à l'icône, au
          compteur ni au chevron — et sans le retirer du DOM, donc toujours lu
          par les lecteurs d'écran. */}
      <span className="nav-item-label">{children}</span>
      {typeof count === 'number' && <span className="badge">{count}</span>}
      {/* Le chevron indique un sous-menu ; il ne remplace pas le badge, les deux
          peuvent coexister (« Dossiers » porte un compteur ET des sous-entrées). */}
      {expandable && (
        <svg className={expanded ? 'nav-chev open' : 'nav-chev'} aria-hidden="true">
          <use href="#i-chevr" />
        </svg>
      )}
    </button>
  );
}
