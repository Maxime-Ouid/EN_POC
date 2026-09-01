import { useEffect, useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';

export interface TenantOption {
  subdomain: string;
  name: string;
  role: string;
}

export interface TenantSwitcherProps {
  /** Office courant — ce que porte le bouton, même quand la liste est fermée. */
  name: string;
  role: string;
  /**
   * Offices auxquels l'utilisateur appartient. En dessous de deux, il n'y a
   * rien à choisir : le composant redevient une simple étiquette, sans chevron
   * ni clic — un menu à une entrée fait croire à un choix qui n'existe pas.
   */
  offices?: TenantOption[];
  /** Sous-domaine de l'office courant, coché dans la liste. */
  currentSubdomain?: string;
  /** Reçoit le sous-domaine choisi — à brancher sur l'échange de ticket SSO (voir switchOffice() dans App.tsx). */
  onSelect?: (subdomain: string) => void;
}

// Sélecteur d'office — liste déroulante des offices auxquels l'utilisateur
// appartient, l'office courant coché. C'était auparavant un bouton qui
// basculait vers « l'autre » office : tenable à deux, faux au-delà, et dans
// tous les cas on ne savait pas où l'on allait atterrir avant d'y être. À
// brancher sur l'échange de ticket SSO (voir switchOffice() dans App.tsx).
export function TenantSwitcher({
  name,
  role,
  offices = [],
  currentSubdomain,
  onSelect,
}: TenantSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectable = Boolean(onSelect) && offices.length > 1;

  // Un clic ailleurs ou Échap referment — même règle que les menus de la barre
  // d'onglets (voir NavBar.tsx) : un panneau laissé ouvert derrière l'écran
  // suivant est un panneau oublié.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const body = (
    <>
      <div className="tsicon">
        <Icon id="building" />
      </div>
      <div className="tenant-text">
        <div className="tenant-name">{name}</div>
        <div className="tenant-role">{role}</div>
      </div>
      {selectable && <Icon id="chevd" className="chev" />}
    </>
  );

  if (!selectable) {
    return (
      <div className="tenant-picker">
        <div className="tenant-switcher" title={`${name} — ${role}`}>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-picker" ref={rootRef}>
      <button
        type="button"
        className="tenant-switcher clickable"
        title={`${name} — ${role}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Office courant : ${name}. Changer d'office`}
        onClick={() => setOpen(prev => !prev)}
      >
        {body}
      </button>
      {open && (
        <div className="tenant-menu" role="listbox" aria-label="Offices disponibles">
          {offices.map(office => {
            const active = office.subdomain === currentSubdomain;
            return (
              <button
                key={office.subdomain}
                type="button"
                role="option"
                aria-selected={active}
                className={active ? 'tenant-menu-item active' : 'tenant-menu-item'}
                onClick={() => {
                  setOpen(false);
                  // L'office courant ne se « rechoisit » pas : ce serait une
                  // navigation plein page pour revenir au même endroit.
                  if (!active) onSelect?.(office.subdomain);
                }}
              >
                <span className="tenant-menu-text">
                  <span className="tenant-menu-name">{office.name}</span>
                  <span className="tenant-menu-role">{office.role}</span>
                </span>
                {active && <Icon id="check" className="tenant-menu-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
