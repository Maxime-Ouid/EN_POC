import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
}

// Overlay + boîte modale — §6.11. `open` pilote `.overlay.is-active` (le
// prototype le faisait en JS via openModal()/closeModal()).
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  return (
    <div className={open ? 'overlay is-active' : 'overlay'} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 16 }}>
            {title}
          </div>
          <svg
            className="icon"
            style={{ width: 18, height: 18, cursor: 'pointer', color: 'var(--ink-500)' }}
            onClick={onClose}
          >
            <use href="#i-x" />
          </svg>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export interface TplOptionProps {
  icon: string;
  name: string;
  desc: string;
  onClick?: () => void;
}

// Ligne de sélection de modèle dans la modale "Nouveau dossier" — réutilisé
// aussi tel quel dans le prototype pour lister des modèles de dataroom.
export function TplOption({ icon, name, desc, onClick }: TplOptionProps) {
  return (
    <div className="tpl-option" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="row-icon">
        <svg className="icon">
          <use href={`#i-${icon}`} />
        </svg>
      </div>
      <div>
        <div className="tpl-name">{name}</div>
        <div className="tpl-desc">{desc}</div>
      </div>
    </div>
  );
}
