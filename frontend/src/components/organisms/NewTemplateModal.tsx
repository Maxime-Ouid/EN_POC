import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { TextInput } from '../atoms/TextInput';
import { Textarea } from '../atoms/Textarea';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export interface NewTemplateModalProps {
  open: boolean;
  /** Message du serveur si la création a été refusée (nom vide, 403…). */
  error?: string | null;
  onClose: () => void;
  onCreate: (data: { name: string; description: string }) => void;
}

/**
 * Création d'un modèle de dossier — l'intitulé seulement.
 *
 * L'arborescence se remplit ensuite dans l'éditeur : demander les deux d'un
 * coup obligerait à construire un arbre entier avant d'avoir un modèle à quoi
 * le rattacher, alors que le backend crée le modèle vide puis ses dossiers un
 * par un (POST /api/templates/, puis .../folders/).
 */
export function NewTemplateModal({ open, error, onClose, onCreate }: NewTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau modèle de dossier"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), description })}
          >
            Créer le modèle
          </Button>
        </>
      }
    >
      <div className="tiny dim">
        Un modèle est une structure de dossiers réutilisable. Le créer ne touche à
        aucun dossier existant, et le modifier plus tard ne modifiera pas non plus les
        dossiers déjà ouverts à partir de lui.
      </div>

      <Field label="Nom du modèle" style={{ marginTop: 10 }}>
        <TextInput
          placeholder="Ex. Vente immobilière — standard"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Description">
        <Textarea
          rows={2}
          placeholder="À quoi sert ce modèle, et dans quels cas le choisir."
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
