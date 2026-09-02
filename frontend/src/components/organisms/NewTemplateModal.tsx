import { useState } from 'react';
import { Button } from '../atoms/Button';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export interface NewTemplateModalProps {
  open: boolean;
  /** 'edit' pré-remplit les champs à partir de `initial` et change les libellés. */
  mode: 'create' | 'edit';
  /**
   * Valeurs de départ en mode 'edit' — lues UNE SEULE FOIS au montage
   * (useState). L'appelant doit remonter le composant (prop `key` distincte)
   * en passant d'un modèle à l'autre, sinon les champs garderaient ceux du
   * précédent — même convention que OfficeUserModal (create/attach) dans App.tsx.
   */
  initial?: { name: string; description: string };
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
}

/**
 * Création ou modification d'un modèle de dataroom (Template) — juste son nom
 * et sa description ; l'arborescence de dossiers se gère séparément, une fois
 * le modèle créé (voir TemplateDetailScreen). Même patron create/edit que
 * OfficeUserModal (create/attach) : un seul composant, le mode change les
 * libellés et le pré-remplissage.
 */
export function NewTemplateModal({ open, mode, initial, error, onClose, onSubmit }: NewTemplateModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const editing = mode === 'edit';

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, description: description.trim() });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier le modèle' : 'Nouveau modèle'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? 'Enregistrer' : 'Créer le modèle'}
          </Button>
        </>
      }
    >
      <Field label="Nom du modèle">
        <TextInput
          placeholder="Ex. Vente immobilière — standard"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Description">
        <TextInput
          placeholder="Ex. Recommandé, le plus utilisé par les offices"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </Field>
      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
