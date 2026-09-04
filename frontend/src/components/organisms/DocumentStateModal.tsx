import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Pill } from '../atoms/Pill';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   État d'un document — §4.2 (« ajouter un état à un document ») et §4.7
   (« documents spéciaux : en attente, non applicable »).

   Ces deux états ne sont pas des étiquettes décoratives : ce sont les seuls
   moyens de dire, dans une arborescence type, qu'une pièce ATTENDUE n'est pas
   encore là (« en attente ») ou n'a pas lieu d'être pour ce dossier
   (« non applicable »). C'est ce qui permet de livrer un template complet sans
   laisser croire à un oubli — et c'est exactement ce que montre l'arborescence
   de l'annexe A, où plusieurs rubriques portent « Non concerné ».

   Une pièce en attente ou non applicable n'a pas de fichier : la ligne
   correspondante est grisée et non ouvrable (`muted` côté écran).
   =========================================================================== */

export type DocumentState = 'depose' | 'en-attente' | 'non-applicable' | 'a-signer' | 'signe';

export const DOCUMENT_STATES: Array<{
  key: DocumentState;
  label: string;
  kind: PillKind;
  help: string;
}> = [
  { key: 'depose', label: 'Déposé', kind: 'success', help: 'La pièce est présente et consultable.' },
  { key: 'a-signer', label: 'À signer', kind: 'warning', help: 'Déposée, en attente de signature.' },
  { key: 'signe', label: 'Signé', kind: 'success', help: 'Signée électroniquement ou manuscritement.' },
  {
    key: 'en-attente',
    label: 'En attente',
    kind: 'warning',
    help: 'Pièce annoncée mais pas encore déposée — la ligne reste visible et grisée.',
  },
  {
    key: 'non-applicable',
    label: 'Non applicable',
    kind: 'neutral',
    help: "La pièce n'a pas lieu d'être pour ce dossier. Évite qu'on la cherche.",
  },
];

export interface DocumentStateModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  state: DocumentState;
  /** Note libre attachée à l'état (« attendu du notaire du vendeur »). */
  note?: string;
  onSubmit?: (state: DocumentState, note: string) => void;
}

export function DocumentStateModal({
  open,
  onClose,
  documentName,
  state,
  note = '',
  onSubmit,
}: DocumentStateModalProps) {
  const [selected, setSelected] = useState<DocumentState>(state);
  const [text, setText] = useState(note);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="État de la pièce"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => onSubmit?.(selected, text)}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        <b>{documentName}</b>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
        {DOCUMENT_STATES.map(s => (
          <label
            key={s.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              background: selected === s.key ? 'var(--surface-alt)' : 'transparent',
              margin: 0,
            }}
          >
            <input
              type="radio"
              name="doc-state"
              checked={selected === s.key}
              onChange={() => setSelected(s.key)}
              style={{ marginTop: 3 }}
            />
            <span>
              <Pill kind={s.kind}>{s.label}</Pill>
              <span className="tiny dim" style={{ display: 'block', marginTop: 4 }}>
                {s.help}
              </span>
            </span>
          </label>
        ))}
      </div>

      <Field label="Note (facultative)">
        <TextInput
          value={text}
          placeholder="Ex. attendu du notaire du vendeur avant le 20/09"
          onChange={e => setText(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
