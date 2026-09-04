import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Changement de mot de passe imposé à la première connexion — §11.1.

   Le cas concerne les comptes créés par l'étude pour ses clients : le mot de
   passe provisoire a circulé par courriel, il ne doit pas rester en vigueur.
   La fenêtre ne se ferme donc pas — c'est le point de la contrainte — et la
   seule échappatoire est la déconnexion.

   Les règles ANSSI/CNIL sont affichées et vérifiées à la saisie plutôt qu'au
   retour du serveur : refuser un mot de passe après coup, sans avoir dit à
   quoi il devait ressembler, est la première cause d'abandon sur ce type
   d'écran.
   =========================================================================== */

export interface ForcePasswordChangeModalProps {
  open: boolean;
  /** Sortie de secours : déconnexion, jamais une simple fermeture. */
  onLogout: () => void;
  onSubmit?: (password: string) => void;
}

const MIN_LENGTH = 12;

export function ForcePasswordChangeModal({
  open,
  onLogout,
  onSubmit,
}: ForcePasswordChangeModalProps) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = next.length >= MIN_LENGTH && next === confirm;

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Choisissez votre mot de passe"
      footer={
        <>
          <Button onClick={onLogout}>Se déconnecter</Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSubmit?.(next)}>
            Enregistrer et continuer
          </Button>
        </>
      }
    >
      <Card padded style={{ marginBottom: 16 }}>
        <div className="tiny dim">
          Votre mot de passe provisoire a été transmis par courriel&nbsp;: il doit être
          remplacé avant d'accéder à vos dossiers.
        </div>
      </Card>

      <FieldRow>
        <Field label="Nouveau mot de passe">
          <TextInput
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Confirmation">
          <TextInput type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Field>
      </FieldRow>

      <div className="tiny dim">
        {MIN_LENGTH} caractères minimum, sans reprendre le mot de passe provisoire —
        recommandations ANSSI/CNIL.
      </div>
      {tooShort && (
        <div className="tiny" style={{ color: 'var(--critical)', marginTop: 8 }}>
          Encore {MIN_LENGTH - next.length} caractère(s).
        </div>
      )}
      {mismatch && (
        <div className="tiny" style={{ color: 'var(--critical)', marginTop: 8 }}>
          Les deux saisies diffèrent.
        </div>
      )}
    </Modal>
  );
}
