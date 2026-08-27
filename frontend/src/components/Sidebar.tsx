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

export interface SidebarBrandProps {
  logoUrl?: string;
  name: string;
  sub: string;
}

// En-tête de la sidebar (logo + nom d'office/produit).
export function SidebarBrand({ logoUrl, name, sub }: SidebarBrandProps) {
  return (
    <div className="brand">
      <div className="mark">
        {logoUrl ? (
          <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <svg className="icon" style={{ width: '60%', height: '60%', color: '#fff' }}>
            <use href="#i-building" />
          </svg>
        )}
      </div>
      <div>
        <div className="brand-name">{name}</div>
        <div className="brand-sub">{sub}</div>
      </div>
    </div>
  );
}

export interface TenantSwitcherProps {
  name: string;
  role: string;
  onClick?: () => void;
}

// Sélecteur d'office cliquable — pattern de la V1 (voir §6.14 / mémoire de
// projet "personnalisation") : à brancher sur l'échange de ticket SSO déjà en
// place côté backend (voir switchOffice() dans App.tsx).
export function TenantSwitcher({ name, role, onClick }: TenantSwitcherProps) {
  return (
    <div className="tenant-switcher clickable" onClick={onClick}>
      <div className="tsicon">
        <svg className="icon">
          <use href="#i-building" />
        </svg>
      </div>
      <div>
        <div className="tenant-name">{name}</div>
        <div className="tenant-role">{role}</div>
      </div>
      <svg className="icon chev">
        <use href="#i-chevd" />
      </svg>
    </div>
  );
}

export interface NavProps {
  children?: ReactNode;
}

export function Nav({ children }: NavProps) {
  return <nav className="nav">{children}</nav>;
}

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

export interface SidebarFootProps {
  initials: string;
  name: string;
  role: string;
  onLogout?: () => void;
  poweredByLogoUrl?: string;
}

// Pied de sidebar : utilisateur connecté (clic = déconnexion) + mention
// "propulsé par Notantis" — les tokens --brand-strong/--brand-soft existent
// spécifiquement pour garder cette mention lisible en thème sombre (voir
// DESIGN_SYSTEM.md §3, note du 26/08/2026).
export function SidebarFoot({ initials, name, role, onLogout, poweredByLogoUrl }: SidebarFootProps) {
  return (
    <div className="sidebar-foot">
      <div className="foot-user clickable" onClick={onLogout}>
        <div className="avatar">{initials}</div>
        <div>
          <div className="foot-name">{name}</div>
          <div className="foot-role">{role}</div>
        </div>
        <svg className="icon">
          <use href="#i-logout" />
        </svg>
      </div>
      {poweredByLogoUrl && (
        <div className="notantis-mark">
          <img src={poweredByLogoUrl} alt="" style={{ width: 11, height: 11, display: 'block' }} />
          propulsé par Notantis
        </div>
      )}
    </div>
  );
}
