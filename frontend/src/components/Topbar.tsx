import type { ReactNode } from 'react';
import { IconButton } from './Button';

export interface TopbarProps {
  children?: ReactNode;
}

export function Topbar({ children }: TopbarProps) {
  return <header className="topbar">{children}</header>;
}

export interface BreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
  current: string;
}

// Fil d'ariane — utilisé à la fois dans la topbar (office > écran) et en tête
// d'écran détail dataroom (dossiers > portefeuille > dossier).
export function Breadcrumb({ items, current }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {item.onClick ? (
            <a href="#" className="dim" onClick={e => { e.preventDefault(); item.onClick?.(); }}>
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
          <svg className="icon">
            <use href="#i-chevr" />
          </svg>
        </span>
      ))}
      <b>{current}</b>
    </div>
  );
}

export interface TopbarSearchProps {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  shortcut?: string;
}

export function TopbarSearch({ placeholder, value, onChange, shortcut }: TopbarSearchProps) {
  return (
    <div className="topbar-search">
      <svg className="icon">
        <use href="#i-search" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
      />
      {shortcut && <kbd>{shortcut}</kbd>}
    </div>
  );
}

export interface TopbarRightProps {
  children?: ReactNode;
}

export function TopbarRight({ children }: TopbarRightProps) {
  return <div className="topbar-right">{children}</div>;
}

export interface ProtoPillProps {
  label: string;
}

// Bandeau "Aperçu — maquette visuelle" affiché dans le prototype — à retirer
// une fois l'app connectée à de vraies données (garder le composant est utile
// pour rejouer un mode démo / preview plus tard).
export function ProtoPill({ label }: ProtoPillProps) {
  return (
    <div className="proto-pill">
      <svg className="icon">
        <use href="#i-eye" />
      </svg>
      {label}
    </div>
  );
}

export { IconButton };
