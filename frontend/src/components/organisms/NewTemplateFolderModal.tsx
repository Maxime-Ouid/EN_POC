import { useState } from 'react';
import { Button } from '../atoms/Button';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export interface NewTemplateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  /** Libellé du niveau où le dossier sera créé (racine du modèle ou nom du dossier parent). */
  parentLabel?: string;
}

// Modale "Nouveau dossier" d'un Template — même patron exact que NewFolderModal
// (dataroom réelle) : le dossier parent est déjà déterminé par le nœud
// sélectionné dans l'arborescence, pas choisi ici. Les rôles visibles ne se
// règlent pas à la création : voir TemplateDetailScreen, une fois le dossier créé.
export function NewTemplateFolderModal({ open, onClose, onCreate, parentLabel }: NewTemplateFolderModalProps) {
  const [name, setName] = useState('');

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau dossier"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleCreate}>
            Créer le dossier
          </Button>
        </>
      }
    >
      {parentLabel && <div className="tiny dim">Dans : {parentLabel}</div>}
      <Field label="Nom du dossier" style={{ marginTop: 10 }}>
        <TextInput
          placeholder="Ex. Diagnostics"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </Field>
    </Modal>
  );
}
