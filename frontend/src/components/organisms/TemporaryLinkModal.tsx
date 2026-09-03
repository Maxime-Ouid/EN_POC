import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Select } from '../atoms/Select';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Lien temporaire de téléchargement — §3.2 du document de vision.

   « Création d'un lien temporaire pour donner la possibilité de télécharger un
   document à une personne NON MEMBRE de la dataroom. » C'est le seul chemin
   par lequel un document sort de l'espace des membres : la maquette expose
   donc explicitement les trois bornes qui rendent ce partage acceptable au
   regard du secret professionnel — une échéance, un plafond de
   téléchargements, une protection facultative par mot de passe — plutôt qu'un
   simple bouton « copier le lien ».

   Les liens créés sont listés sous le formulaire, avec révocation : un partage
   qu'on ne peut pas reprendre n'est pas un partage, c'est une fuite. Le compte
   des téléchargements déjà effectués y figure parce que c'est la seule chose
   qui dit si le lien a servi, et à combien de reprises.
   =========================================================================== */

export interface TemporaryLink {
  id: string;
  /** Document ou dossier partagé. */
  target: string;
  recipient: string;
  /** Échéance déjà formatée (« 12 sept. 2026, 18:00 »). */
  expiresAt: string;
  downloads: number;
  maxDownloads: number | null;
  passwordProtected: boolean;
  /** `true` quand l'échéance est passée ou le plafond atteint. */
  expired?: boolean;
}

export interface TemporaryLinkFormValue {
  recipient: string;
  validityDays: number;
  maxDownloads: number | null;
  passwordProtected: boolean;
  message: string;
}

export interface TemporaryLinkModalProps {
  open: boolean;
  onClose: () => void;
  /** Nom du document ou du dossier partagé, affiché en tête. */
  target: string;
  links: TemporaryLink[];
  onCreate?: (value: TemporaryLinkFormValue) => void;
  onRevoke?: (id: string) => void;
}

const VALIDITIES = [
  { days: 1, label: '24 heures' },
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
];

export function TemporaryLinkModal({
  open,
  onClose,
  target,
  links,
  onCreate,
  onRevoke,
}: TemporaryLinkModalProps) {
  const [recipient, setRecipient] = useState('');
  const [validityDays, setValidityDays] = useState(7);
  const [maxDownloads, setMaxDownloads] = useState<string>('3');
  const [passwordProtected, setPasswordProtected] = useState(true);
  const [message, setMessage] = useState('');

  function submit() {
    onCreate?.({
      recipient,
      validityDays,
      // Champ vidé = aucun plafond : le distinguer de « 0 » évite un lien mort-né.
      maxDownloads: maxDownloads.trim() === '' ? null : Number(maxDownloads),
      passwordProtected,
      message,
    });
    setRecipient('');
    setMessage('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lien temporaire de téléchargement"
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          <Button variant="primary" onClick={submit} disabled={!recipient.trim()}>
            Créer le lien
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        Partage de <b>{target}</b> avec une personne qui n'est pas membre de cette dataroom.
        Le lien ne donne accès qu'à cette pièce, jamais au reste du dossier.
      </div>

      <Field label="Destinataire">
        <input
          type="email"
          placeholder="prenom.nom@exemple.fr"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
        />
      </Field>

      <FieldRow>
        <Field label="Validité">
          <Select value={validityDays} onChange={e => setValidityDays(Number(e.target.value))}>
            {VALIDITIES.map(v => (
              <option key={v.days} value={v.days}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Téléchargements maximum">
          <input
            type="number"
            min={1}
            placeholder="illimité"
            value={maxDownloads}
            onChange={e => setMaxDownloads(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="Message joint à l'invitation">
        <input
          type="text"
          placeholder="Optionnel — visible dans le courriel d'envoi"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          borderTop: '1px solid var(--line)',
          marginTop: 6,
        }}
      >
        <Toggle checked={passwordProtected} onChange={setPasswordProtected} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Protéger par un mot de passe</div>
          <div className="tiny dim">
            Un code à usage unique est transmis séparément au destinataire.
          </div>
        </div>
      </div>

      {links.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16, marginBottom: 8 }}>
            Liens actifs sur cette dataroom
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th>Destinataire</th>
                  <th>Échéance</th>
                  <th>Téléchargements</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id}>
                    <td className="row-name">
                      {l.passwordProtected && <Icon id="lock" />}
                      {l.target}
                    </td>
                    <td className="dim">{l.recipient}</td>
                    <td>
                      {l.expired ? (
                        <Pill kind="neutral">Expiré</Pill>
                      ) : (
                        <span className="tiny dim">{l.expiresAt}</span>
                      )}
                    </td>
                    <td className="mono">
                      {l.downloads}
                      {l.maxDownloads === null ? '' : ` / ${l.maxDownloads}`}
                    </td>
                    <td>
                      {!l.expired && (
                        <Button size="sm" onClick={() => onRevoke?.(l.id)}>
                          Révoquer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
