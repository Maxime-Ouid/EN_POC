import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { TableCard } from '../organisms/TableCard';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   Notifications de l'application d'administration — §5.1.

   « Elle permet notamment d'envoyer des notifications aux EN (par exemple :
   information de maintenance, nouveauté, alerte), avec un ciblage possible
   (tous les EN, un sous-ensemble d'offices, un EN donné), la notification
   étant ensuite diffusée aux utilisateurs de l'EN concerné. »

   Deux étages de diffusion, et c'est le point que l'écran doit rendre
   évident : Notantis notifie des OFFICES, et chaque office rediffuse à SES
   utilisateurs. Le choix « qui, dans l'office, la voit » est donc un réglage
   du message et non une liste de destinataires — un support qui composerait
   une liste nominative d'utilisateurs finaux sortirait du rôle décrit ici et
   du cloisonnement multi-tenant.

   Le type d'annonce n'est pas cosmétique : une alerte s'impose à l'écran, une
   nouveauté attend d'être lue. La maquette le dit sous le sélecteur plutôt que
   de laisser trois couleurs le suggérer.
   =========================================================================== */

export type PlatformNoticeKind = 'maintenance' | 'nouveaute' | 'alerte';

const KIND_META: Record<PlatformNoticeKind, { label: string; pill: PillKind; help: string }> = {
  maintenance: {
    label: 'Maintenance',
    pill: 'warning',
    help: "Bandeau affiché jusqu'à la date de fin, puis retiré automatiquement.",
  },
  nouveaute: {
    label: 'Nouveauté',
    pill: 'info',
    help: "Notification discrète dans la cloche, sans interrompre le travail en cours.",
  },
  alerte: {
    label: 'Alerte',
    pill: 'critical',
    help: "Bandeau permanent jusqu'à accusé de lecture par un administrateur de l'office.",
  },
};

export type NoticeAudience = 'tous' | 'selection' | 'office';
export type NoticeRecipients = 'tous' | 'admins';

export interface SentNotice {
  id: string;
  kind: PlatformNoticeKind;
  title: string;
  audienceLabel: string;
  sentAt: string;
  /** Offices ayant accusé lecture, sur le nombre ciblé. */
  readBy: string;
}

export interface PlatformNotificationsScreenProps {
  officeOptions: Array<{ id: string; label: string }>;
  history: SentNotice[];
  onSend?: (value: {
    kind: PlatformNoticeKind;
    title: string;
    body: string;
    audience: NoticeAudience;
    officeIds: string[];
    recipients: NoticeRecipients;
    alsoByEmail: boolean;
    until: string;
  }) => void;
}

export function PlatformNotificationsScreen({
  officeOptions,
  history,
  onSend,
}: PlatformNotificationsScreenProps) {
  const [kind, setKind] = useState<PlatformNoticeKind>('maintenance');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<NoticeAudience>('tous');
  const [officeIds, setOfficeIds] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<NoticeRecipients>('tous');
  const [alsoByEmail, setAlsoByEmail] = useState(false);
  const [until, setUntil] = useState('');

  const targetCount =
    audience === 'tous' ? officeOptions.length : audience === 'office' ? Math.min(1, officeIds.length) : officeIds.length;

  function toggleOffice(id: string) {
    setOfficeIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  return (
    <Screen>
      <Card padded style={{ maxWidth: 780 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>
          Nouvelle annonce
        </div>

        <FieldRow>
          <Field label="Type">
            <Select value={kind} onChange={e => setKind(e.target.value as PlatformNoticeKind)}>
              {(Object.keys(KIND_META) as PlatformNoticeKind[]).map(k => (
                <option key={k} value={k}>
                  {KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Affichée jusqu'au">
            <TextInput type="date" value={until} onChange={e => setUntil(e.target.value)} />
          </Field>
        </FieldRow>
        <div className="tiny dim" style={{ marginTop: -6, marginBottom: 16 }}>
          {KIND_META[kind].help}
        </div>

        <Field label="Titre">
          <TextInput
            value={title}
            placeholder="Ex. Interruption de service samedi 12 septembre, 22h–23h"
            onChange={e => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Message">
          <Textarea
            rows={4}
            value={body}
            placeholder="Ce que l'office doit savoir, et ce qu'il doit faire le cas échéant."
            onChange={e => setBody(e.target.value)}
          />
        </Field>

        <Field label="Destinataires">
          <Select value={audience} onChange={e => setAudience(e.target.value as NoticeAudience)}>
            <option value="tous">Tous les Espaces Notariaux ({officeOptions.length})</option>
            <option value="selection">Une sélection d'offices</option>
            <option value="office">Un office en particulier</option>
          </Select>
        </Field>

        {audience !== 'tous' && (
          <div
            style={{
              maxHeight: 190,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 8,
              marginBottom: 14,
            }}
          >
            {officeOptions.map(o => (
              <label
                key={o.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 2px', margin: 0 }}
              >
                <input
                  type={audience === 'office' ? 'radio' : 'checkbox'}
                  name="notice-office"
                  checked={officeIds.includes(o.id)}
                  onChange={() =>
                    audience === 'office' ? setOfficeIds([o.id]) : toggleOffice(o.id)
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
        )}

        <Field label="Dans l'office, la voient">
          <Select
            value={recipients}
            onChange={e => setRecipients(e.target.value as NoticeRecipients)}
          >
            <option value="tous">Tous les utilisateurs de l'EN</option>
            <option value="admins">Les administrateurs de l'office seulement</option>
          </Select>
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
          <Toggle checked={alsoByEmail} onChange={setAlsoByEmail} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Doubler par un courriel</div>
            <div className="tiny dim">
              À réserver aux interruptions de service : l'annonce arrive de toute façon dans
              l'application.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="sm"
            disabled={!title.trim() || targetCount === 0}
            onClick={() =>
              onSend?.({ kind, title, body, audience, officeIds, recipients, alsoByEmail, until })
            }
          >
            <Icon id="send" />
            Envoyer l'annonce
          </Button>
          <span className="tiny dim">
            {targetCount} office{targetCount > 1 ? 's' : ''} ciblé{targetCount > 1 ? 's' : ''}.
          </span>
        </div>
      </Card>

      <div className="section-title" style={{ marginTop: 24, marginBottom: 10 }}>
        Annonces envoyées
      </div>
      <TableCard headers={['Type', 'Titre', 'Ciblage', 'Envoyée le', 'Accusés de lecture']}>
        {history.map(h => (
          <tr key={h.id}>
            <td>
              <Pill kind={KIND_META[h.kind].pill}>{KIND_META[h.kind].label}</Pill>
            </td>
            <td className="row-name">{h.title}</td>
            <td className="dim">{h.audienceLabel}</td>
            <td className="dim">{h.sentAt}</td>
            <td className="mono">{h.readBy}</td>
          </tr>
        ))}
      </TableCard>
    </Screen>
  );
}
