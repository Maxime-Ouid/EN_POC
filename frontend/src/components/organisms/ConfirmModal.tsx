import { Button } from '../atoms/Button';
import { Modal } from './Modal';
import type { ReactNode } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  /** Ce qui va se passer, en toutes lettres — pas « Êtes-vous sûr ? ». */
  children?: ReactNode;
  /** Libellé du bouton d'action : un verbe qui nomme l'acte (« Retirer », « Supprimer »). */
  confirmLabel: string;
  /** Action irréversible : le bouton prend la couleur critique. */
  destructive?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation d'une action, avec son énoncé complet.
 *
 * Le corps décrit la conséquence plutôt que de demander une confirmation vide :
 * une modale qui dit « Êtes-vous sûr ? » ne donne rien à décider, et on finit
 * par la valider sans lire. Le bouton porte le verbe de l'action, pour que le
 * dernier mot lu avant le clic soit ce qui va réellement se produire.
 */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  destructive,
  error,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel}>Annuler</Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            style={destructive ? { background: 'var(--critical)', borderColor: 'var(--critical)' } : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="tiny dim">{children}</div>
      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
