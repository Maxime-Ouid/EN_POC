import { useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Pill } from '../atoms/Pill';
import { TextInput } from '../atoms/TextInput';
import { Textarea } from '../atoms/Textarea';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

/* ===========================================================================
   Prise d'identité par le support — §5, schéma d'architecture : « peut se
   connecter et prendre l'identité d'un utilisateur de l'EN ».

   C'est la fonction la plus sensible de toute l'application d'administration :
   elle donne à un agent Notantis la vue exacte d'un utilisateur d'office, donc
   l'accès à des documents couverts par le secret professionnel notarial. La
   maquette impose donc trois garde-fous, et les rend visibles plutôt que de
   les enfouir dans une politique :

   1. un MOTIF obligatoire, saisi avant l'accès et non après — c'est lui qui
      rend la session justifiable a posteriori ;
   2. une DURÉE bornée, la session expirant d'elle-même : une prise d'identité
      qui ne se termine pas est un compte partagé ;
   3. une TRAÇABILITÉ annoncée à l'écran : l'ouverture, chaque document ouvert
      et la fin de session partent au journal de sécurité transverse (§7.7), et
      l'office concerné en est informé.

   L'accès est explicitement en LECTURE SEULE. Rien dans la vision ne demande
   au support d'agir au nom d'un notaire, et une action passée sous l'identité
   d'un tiers serait indéfendable dans un audit.
   =========================================================================== */

export interface ImpersonateCandidate {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
}

export interface ImpersonateModalProps {
  open: boolean;
  onClose: () => void;
  officeName: string;
  users: ImpersonateCandidate[];
  onStart?: (value: { userId: string; reason: string; minutes: number }) => void;
}

const DURATIONS = [15, 30, 60];

export function ImpersonateModal({ open, onClose, officeName, users, onStart }: ImpersonateModalProps) {
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState(30);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(needle))
    : users;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Prise d'identité — ${officeName}`}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!userId || reason.trim().length < 10}
            onClick={() => userId && onStart?.({ userId, reason, minutes })}
          >
            Ouvrir la session
          </Button>
        </>
      }
    >
      <Card padded style={{ marginBottom: 14 }}>
        <div className="tiny dim">
          Vous verrez l'application exactement comme cet utilisateur, <b>en lecture seule</b>.
          L'ouverture, chaque document consulté et la fin de session sont inscrits au journal de
          sécurité, et l'office en est informé.
        </div>
      </Card>

      <Field label="Utilisateur">
        <TextInput
          value={query}
          placeholder="Nom ou adresse électronique"
          onChange={e => setQuery(e.target.value)}
        />
      </Field>

      <div
        style={{
          maxHeight: 210,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        {visible.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => setUserId(u.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              border: 'none',
              background: userId === u.id ? 'var(--info-bg)' : 'transparent',
              padding: '9px 12px',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
            }}
          >
            <Avatar size="sm">{u.initials}</Avatar>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
              <span className="tiny dim" style={{ display: 'block' }}>
                {u.email}
              </span>
            </span>
            <Pill kind="neutral">{u.role}</Pill>
          </button>
        ))}
        {visible.length === 0 && (
          <div className="tiny dim" style={{ padding: 16, textAlign: 'center' }}>
            Aucun utilisateur ne correspond.
          </div>
        )}
      </div>

      <Field label="Motif de la prise d'identité (obligatoire)">
        <Textarea
          rows={3}
          value={reason}
          placeholder="Ex. ticket TCK-4821 — l'utilisateur ne voit pas le sous-dossier Diagnostics"
          onChange={e => setReason(e.target.value)}
        />
      </Field>
      {reason.trim().length > 0 && reason.trim().length < 10 && (
        <div className="tiny" style={{ color: 'var(--critical)', marginTop: -6, marginBottom: 12 }}>
          Un motif exploitable, pas un mot&nbsp;: c'est lui qui justifiera l'accès en audit.
        </div>
      )}

      <Field label="Durée de la session">
        <div style={{ display: 'flex', gap: 8 }}>
          {DURATIONS.map(m => (
            <Button
              key={m}
              size="sm"
              variant={minutes === m ? 'accent' : 'default'}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </Button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}
