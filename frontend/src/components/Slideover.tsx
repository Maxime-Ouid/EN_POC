import type { ReactNode } from 'react';

export interface SlideoverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

// Panneau latéral (fiche document) — §6.12. `open` pilote `.slideover.is-active`.
export function Slideover({ open, onClose, title, children }: SlideoverProps) {
  return (
    <div className={open ? 'slideover is-active' : 'slideover'}>
      <div className="slideover-head">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <svg className="icon" style={{ cursor: 'pointer', color: 'var(--ink-500)' }} onClick={onClose}>
          <use href="#i-x" />
        </svg>
      </div>
      <div className="slideover-body">{children}</div>
    </div>
  );
}

export interface SoFieldProps {
  label: string;
  value: ReactNode;
}

// Motif clé/valeur vertical utilisé dans le corps du slideover.
export function SoField({ label, value }: SoFieldProps) {
  return (
    <div className="so-field">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
