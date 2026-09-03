import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export interface RenameFolderModalProps {
  open: boolean;
  currentName: string;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

/**
 * Popup dédié UNIQUEMENT au renommage — ouvert depuis le menu "⋮" d'un nœud de
 * `Explorer`, dans une vraie dataroom comme dans un Template (même composant
 * générique, l'appelant sait quel endpoint appeler). Les droits d'accès
 * restent dans `AccessRightsTable`, jamais ici (voir CLAUDE.md, 02/09/2026).
 */
export function RenameFolderModal({ open, currentName, error, onClose, onSubmit }: RenameFolderModalProps) {
  const [name, setName] = useState(currentName);

  // Repart du nom courant à chaque ouverture — pas de fuite d'un brouillon
  // abandonné d'un dossier à l'autre.
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    onSubmit(trimmed);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Renommer le dossier"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            Renommer
          </Button>
        </>
      }
    >
      <Field label="Nom du dossier">
        <TextInput value={name} onChange={e => setName(e.target.value)} autoFocus />
      </Field>
      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
