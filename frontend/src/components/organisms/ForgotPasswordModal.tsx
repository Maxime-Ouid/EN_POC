import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

/* ===========================================================================
   Réinitialisation autonome du mot de passe — §11.1.

   Le message de confirmation est volontairement le MÊME que l'adresse soit
   connue ou non : répondre « compte inconnu » transformerait ce formulaire en
   annuaire de comptes notariaux, ce qui est exactement ce que l'objectif OS3
   de la DSN cherche à éviter. C'est la raison du libellé « si un compte
   existe ».

   L'écran rappelle aussi que la MFA reste exigée après réinitialisation :
   reprendre la main sur un mot de passe ne doit pas contourner
   l'authentification forte (OS5).
   =========================================================================== */

export interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (email: string) => void;
}

export function ForgotPasswordModal({ open, onClose, onSubmit }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function submit() {
    onSubmit?.(email);
    setSent(true);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setSent(false);
        setEmail('');
        onClose();
      }}
      title="Mot de passe oublié"
      footer={
        sent ? (
          <Button
            variant="primary"
            onClick={() => {
              setSent(false);
              setEmail('');
              onClose();
            }}
          >
            Revenir à la connexion
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" disabled={!email.includes('@')} onClick={submit}>
              Envoyer le lien
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <Card padded>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Message envoyé, si un compte existe
          </div>
          <div className="tiny dim">
            Un lien valable une heure a été adressé à <b>{email}</b>. Il ne peut servir qu'une
            fois. L'authentification forte restera demandée à la reconnexion.
          </div>
        </Card>
      ) : (
        <>
          <div className="tiny dim" style={{ marginBottom: 14 }}>
            Indiquez l'adresse électronique de votre compte. Vous recevrez un lien de
            réinitialisation valable une heure.
          </div>
          <Field label="Adresse électronique">
            <TextInput
              type="email"
              value={email}
              placeholder="prenom.nom@etude.fr"
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </Field>
        </>
      )}
    </Modal>
  );
}
