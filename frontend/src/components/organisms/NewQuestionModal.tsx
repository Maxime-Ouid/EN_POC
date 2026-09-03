import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

/* ===========================================================================
   Poser une question — §4.3.

   « Poser une question dans une dataroom OU sur un document en particulier » :
   le sélecteur de pièce porte donc une entrée « toute la dataroom » en tête,
   et non un champ laissé vide qu'il faudrait interpréter.

   La case « réservée à l'étude » existe parce que le §11.1 signale que les
   règles de cloisonnement des Q/R ne sont pas explicitées : plutôt que de
   trancher en silence, l'écran expose le choix et l'explique. C'est un point à
   faire arbitrer par le client, pas une règle acquise.
   =========================================================================== */

export interface NewQuestionValue {
  object: string;
  documentId: string | null;
  body: string;
  restrictedToOffice: boolean;
}

export interface NewQuestionModalProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  documentOptions?: Array<{ id: string; label: string }>;
  onSubmit?: (value: NewQuestionValue) => void;
}

export function NewQuestionModal({
  open,
  onClose,
  dataroomName,
  documentOptions = [],
  onSubmit,
}: NewQuestionModalProps) {
  const [object, setObject] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [body, setBody] = useState('');
  const [restrictedToOffice, setRestrictedToOffice] = useState(false);

  function submit() {
    onSubmit?.({
      object,
      documentId: documentId === '' ? null : documentId,
      body,
      restrictedToOffice,
    });
    setObject('');
    setDocumentId('');
    setBody('');
    setRestrictedToOffice(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Poser une question"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!object.trim() || !body.trim()} onClick={submit}>
            Envoyer la question
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        Dans le dossier <b>{dataroomName}</b>.
      </div>

      <Field label="Objet">
        <TextInput
          value={object}
          placeholder="Ex. Servitude de passage — acte de 1975"
          onChange={e => setObject(e.target.value)}
        />
      </Field>

      <Field label="Porte sur">
        <Select value={documentId} onChange={e => setDocumentId(e.target.value)}>
          <option value="">Toute la dataroom</option>
          {documentOptions.map(d => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Question">
        <Textarea
          rows={5}
          value={body}
          placeholder="Détaillez votre question…"
          onChange={e => setBody(e.target.value)}
        />
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}
      >
        <Toggle checked={restrictedToOffice} onChange={setRestrictedToOffice} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Réservée à l'étude</div>
          <div className="tiny dim">
            Visible des seuls membres de l'office, pas des autres intervenants du dossier.
          </div>
        </div>
      </div>
    </Modal>
  );
}
