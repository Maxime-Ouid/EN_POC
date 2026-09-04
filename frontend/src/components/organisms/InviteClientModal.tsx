import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Onboarding d'un client par courriel — §11.1.

   Créer le compte et l'inviter sont un seul geste : l'étude ne connaît pas de
   « compte sans dossier », elle invite quelqu'un DANS un dossier. Le
   formulaire demande donc la dataroom et le groupe dès l'invitation, plutôt
   que de laisser un compte orphelin qu'il faudrait rattacher ensuite — c'est
   d'ailleurs ce que dit la baseline du §9 : 37,6 % des parties prenantes ne se
   sont jamais connectées après invitation.

   Le mot de passe provisoire n'est jamais affiché ici : il part par courriel,
   et le premier accès impose son remplacement (ForcePasswordChangeModal). Le
   montrer à l'écran reviendrait à le faire transiter par une capture ou un
   message, ce que la même exigence cherche à éviter.
   =========================================================================== */

export interface InviteClientValue {
  email: string;
  firstName: string;
  lastName: string;
  dataroomId: string;
  groupId: string;
  message: string;
  requireMfa: boolean;
}

export interface InviteClientModalProps {
  open: boolean;
  onClose: () => void;
  dataroomOptions: Array<{ id: string; label: string }>;
  groupOptions: Array<{ id: string; label: string }>;
  onInvite?: (value: InviteClientValue) => void;
}

export function InviteClientModal({
  open,
  onClose,
  dataroomOptions,
  groupOptions,
  onInvite,
}: InviteClientModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dataroomId, setDataroomId] = useState(dataroomOptions[0]?.id ?? '');
  const [groupId, setGroupId] = useState(groupOptions[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [requireMfa, setRequireMfa] = useState(true);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inviter un client"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!email.includes('@') || !lastName.trim()}
            onClick={() =>
              onInvite?.({ email, firstName, lastName, dataroomId, groupId, message, requireMfa })
            }
          >
            Envoyer l'invitation
          </Button>
        </>
      }
    >
      <FieldRow>
        <Field label="Prénom">
          <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} />
        </Field>
        <Field label="Nom">
          <TextInput value={lastName} onChange={e => setLastName(e.target.value)} />
        </Field>
      </FieldRow>

      <Field label="Adresse électronique">
        <TextInput
          type="email"
          value={email}
          placeholder="prenom.nom@exemple.fr"
          onChange={e => setEmail(e.target.value)}
        />
      </Field>

      <FieldRow>
        <Field label="Dossier">
          <Select value={dataroomId} onChange={e => setDataroomId(e.target.value)}>
            {dataroomOptions.map(d => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Groupe">
          <Select value={groupId} onChange={e => setGroupId(e.target.value)}>
            {groupOptions.map(g => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      <Field label="Mot d'accueil (facultatif)">
        <Textarea
          rows={3}
          value={message}
          placeholder="Ajouté au courriel d'invitation, sous la signature de l'étude."
          onChange={e => setMessage(e.target.value)}
        />
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0 14px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 14,
        }}
      >
        <Toggle checked={requireMfa} onChange={setRequireMfa} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Exiger l'authentification forte</div>
          <div className="tiny dim">
            Obligatoire pour tout accès exposé sur Internet (objectif OS5) — à ne décocher que
            sur dérogation documentée.
          </div>
        </div>
      </div>

      <Card padded>
        <div className="tiny dim">
          Le client reçoit un lien d'activation valable 7 jours et choisit son mot de passe à la
          première connexion. Aucun mot de passe provisoire n'est affiché ici.
        </div>
      </Card>
    </Modal>
  );
}
