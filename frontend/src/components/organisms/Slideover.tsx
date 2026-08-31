import type { ReactNode } from 'react';

export interface SlideoverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Volet large : pour un contenu qui ne tient pas en 340px, typiquement un aperçu de document. */
  wide?: boolean;
  children?: ReactNode;
}

// Panneau latéral (fiche document) — §6.12. `open` pilote `.slideover.is-active`.
export function Slideover({ open, onClose, title, wide, children }: SlideoverProps) {
  const classes = ['slideover', wide ? 'is-wide' : '', open ? 'is-active' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
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
