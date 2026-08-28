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
