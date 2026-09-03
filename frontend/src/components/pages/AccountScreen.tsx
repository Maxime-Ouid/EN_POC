import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { TabStrip } from '../molecules/TabStrip';
import { useTopbarSlots } from '../templates/topbarSlots';
import type { TabDef } from '../molecules/TabStrip';

/* ===========================================================================
   Mon compte — §4.5 (« changement de mot de passe ; gestion de son compte ;
   préférences d'affichage et de notification »).

   C'est le pendant PERSONNEL de Personnalisation, qui règle l'office : ce
   qu'on trouve ici ne concerne que l'utilisateur connecté et le suit d'un
   office à l'autre, puisqu'il n'a qu'un seul compte pour plusieurs tenants
   (§5.3). Les deux écrans se ressemblent volontairement, mais ne se mélangent
   pas — une préférence de notification n'a rien à faire dans la charte de
   l'étude.

   L'écran affiche aussi l'état de l'authentification forte, qui n'a nulle part
   ailleurs où vivre côté utilisateur : la MFA est exigée par l'OS5 de la DSN
   sur tous les accès exposés, il faut donc au minimum pouvoir voir qu'elle est
   active et réenrôler un appareil perdu.
   =========================================================================== */

export type AccountTabKey = 'sub-identite' | 'sub-securite' | 'sub-affichage' | 'sub-notifications';

const TABS: TabDef[] = [
  { key: 'sub-identite', icon: 'users', label: 'Mon identité' },
  { key: 'sub-securite', icon: 'shield', label: 'Sécurité' },
  { key: 'sub-affichage', icon: 'layers', label: 'Affichage' },
  { key: 'sub-notifications', icon: 'bell', label: 'Notifications' },
];

export interface AccountNotificationPrefs {
  documentAdded: boolean;
  questionPosted: boolean;
  questionAnswered: boolean;
  memberAdded: boolean;
  dailyDigest: boolean;
  /** Rapport quotidien plutôt que notification à chaque événement (§11.1). */
  digestHour: string;
}

export interface AccountScreenProps {
  identity: {
    displayName: string;
    email: string;
    phone?: string;
    initials: string;
    /** Offices auxquels ce compte unique donne accès (§5.3). */
    offices: Array<{ name: string; role: string }>;
  };
  security: {
    mfaEnabled: boolean;
    mfaDevice?: string;
    lastPasswordChange: string;
    lastLogin: string;
  };
  display: {
    density: 'confortable' | 'compacte';
    defaultScreen: string;
    dateFormat: string;
  };
  notifications: AccountNotificationPrefs;
  screenOptions: Array<{ key: string; label: string }>;
  onSaveIdentity?: (value: { displayName: string; email: string; phone: string }) => void;
  onChangePassword?: (value: { current: string; next: string }) => void;
  onResetMfa?: () => void;
  onSaveDisplay?: (value: AccountScreenProps['display']) => void;
  onSaveNotifications?: (value: AccountNotificationPrefs) => void;
  defaultTab?: AccountTabKey;
}

export function AccountScreen({
  identity,
  security,
  display,
  notifications,
  screenOptions,
  onSaveIdentity,
  onChangePassword,
  onResetMfa,
  onSaveDisplay,
  onSaveNotifications,
  defaultTab = 'sub-identite',
}: AccountScreenProps) {
  const slots = useTopbarSlots();
  const [activeTab, setActiveTab] = useState<AccountTabKey>(defaultTab);

  const [displayName, setDisplayName] = useState(identity.displayName);
  const [email, setEmail] = useState(identity.email);
  const [phone, setPhone] = useState(identity.phone ?? '');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [displayDraft, setDisplayDraft] = useState(display);
  const [notifDraft, setNotifDraft] = useState(notifications);

  const passwordMismatch = next.length > 0 && confirm.length > 0 && next !== confirm;

  const tabs = (
    <TabStrip tabs={TABS} active={activeTab} onChange={k => setActiveTab(k as AccountTabKey)} />
  );

  function toggleNotif(key: keyof AccountNotificationPrefs) {
    return (checked: boolean) => setNotifDraft(prev => ({ ...prev, [key]: checked }));
  }

  return (
    <Screen>
      {slots.start ? createPortal(tabs, slots.start) : tabs}

      <SubscreenPanel level={2} active={activeTab === 'sub-identite'}>
        <Card padded style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar>{identity.initials}</Avatar>
            <div>
              <div className="section-title">{identity.displayName}</div>
              <div className="tiny dim">{identity.email}</div>
            </div>
          </div>
          <FieldRow>
            <Field label="Nom affiché">
              <TextInput value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </Field>
            <Field label="Adresse électronique">
              <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
          </FieldRow>
          <Field label="Téléphone (facultatif)">
            <TextInput value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
          <Button
            variant="primary"
            size="sm"
            style={{ marginTop: 12 }}
            onClick={() => onSaveIdentity?.({ displayName, email, phone })}
          >
            Enregistrer
          </Button>
        </Card>

        <Card padded style={{ maxWidth: 720, marginTop: 16 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            Mes études
          </div>
          <div className="tiny dim" style={{ marginBottom: 12 }}>
            Un seul compte, plusieurs études. Les droits sont propres à chacune.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Étude</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {identity.offices.map(o => (
                  <tr key={o.name}>
                    <td className="row-name">{o.name}</td>
                    <td>
                      <Pill kind="info">{o.role}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-securite'}>
        <Card padded style={{ maxWidth: 720 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Changer mon mot de passe
          </div>
          <Field label="Mot de passe actuel">
            <TextInput
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
            />
          </Field>
          <FieldRow>
            <Field label="Nouveau mot de passe">
              <TextInput type="password" value={next} onChange={e => setNext(e.target.value)} />
            </Field>
            <Field label="Confirmation">
              <TextInput
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </Field>
          </FieldRow>
          <div className="tiny dim">
            12 caractères minimum, sans réutiliser vos trois derniers mots de passe —
            recommandations ANSSI/CNIL.
          </div>
          {passwordMismatch && (
            <div className="tiny" style={{ color: 'var(--critical)', marginTop: 8 }}>
              Les deux saisies diffèrent.
            </div>
          )}
          <Button
            variant="primary"
            size="sm"
            style={{ marginTop: 12 }}
            disabled={!current || !next || passwordMismatch}
            onClick={() => onChangePassword?.({ current, next })}
          >
            Changer le mot de passe
          </Button>
          <div className="tiny dim" style={{ marginTop: 10 }}>
            Dernière modification&nbsp;: {security.lastPasswordChange}.
          </div>
        </Card>

        <Card padded style={{ maxWidth: 720, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="section-title">Authentification forte</div>
            <Pill kind={security.mfaEnabled ? 'success' : 'critical'}>
              {security.mfaEnabled ? 'Active' : 'Inactive'}
            </Pill>
          </div>
          <div className="tiny dim" style={{ marginBottom: 12 }}>
            {security.mfaDevice
              ? `Appareil enrôlé : ${security.mfaDevice}.`
              : 'Aucun appareil enrôlé.'}{' '}
            Obligatoire sur les accès exposés (objectif OS5 de la directive sécurité).
          </div>
          <Button size="sm" onClick={onResetMfa}>
            Enrôler un nouvel appareil
          </Button>
          <div className="tiny dim" style={{ marginTop: 12 }}>
            Dernière connexion&nbsp;: {security.lastLogin}.
          </div>
        </Card>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-affichage'}>
        <Card padded style={{ maxWidth: 720 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Préférences d'affichage
          </div>
          <FieldRow>
            <Field label="Densité des listes">
              <Select
                value={displayDraft.density}
                onChange={e =>
                  setDisplayDraft({
                    ...displayDraft,
                    density: e.target.value as 'confortable' | 'compacte',
                  })
                }
              >
                <option value="confortable">Confortable</option>
                <option value="compacte">Compacte</option>
              </Select>
            </Field>
            <Field label="Écran d'ouverture">
              <Select
                value={displayDraft.defaultScreen}
                onChange={e => setDisplayDraft({ ...displayDraft, defaultScreen: e.target.value })}
              >
                {screenOptions.map(o => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>
          <Field label="Format de date">
            <Select
              value={displayDraft.dateFormat}
              onChange={e => setDisplayDraft({ ...displayDraft, dateFormat: e.target.value })}
            >
              <option value="jj/mm/aaaa">31/12/2026</option>
              <option value="jj mois aaaa">31 décembre 2026</option>
              <option value="relatif">Relatif (« il y a 3 jours »)</option>
            </Select>
          </Field>
          <div className="tiny dim">
            Le thème clair ou sombre suit votre système ; la charte de couleurs est celle de
            l'étude et se règle dans Personnalisation.
          </div>
          <Button
            variant="primary"
            size="sm"
            style={{ marginTop: 12 }}
            onClick={() => onSaveDisplay?.(displayDraft)}
          >
            Enregistrer
          </Button>
        </Card>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-notifications'}>
        <Card padded style={{ maxWidth: 720 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            Me prévenir par courriel quand…
          </div>
          <div className="tiny dim" style={{ marginBottom: 12 }}>
            Ces réglages valent pour tous les dossiers auxquels vous avez accès dans cette
            étude.
          </div>

          {(
            [
              ['documentAdded', 'Un document est ajouté à un dossier que je suis'],
              ['questionPosted', 'Une question est posée'],
              ['questionAnswered', "Une réponse est apportée à une question que j'ai posée"],
              ['memberAdded', 'Un intervenant rejoint un dossier'],
            ] as Array<[keyof AccountNotificationPrefs, string]>
          ).map(([key, label]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <Toggle checked={Boolean(notifDraft[key])} onChange={toggleNotif(key)} />
              <span style={{ fontSize: 13 }}>{label}</span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <Toggle checked={notifDraft.dailyDigest} onChange={toggleNotif('dailyDigest')} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Regrouper dans un rapport quotidien
              </div>
              <div className="tiny dim">
                Un seul courriel par jour au lieu d'une notification par événement.
              </div>
            </div>
          </div>

          {notifDraft.dailyDigest && (
            <Field label="Heure d'envoi du rapport">
              <Select
                value={notifDraft.digestHour}
                onChange={e => setNotifDraft({ ...notifDraft, digestHour: e.target.value })}
              >
                {['07:00', '08:00', '12:00', '18:00', '20:00'].map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Button
            variant="primary"
            size="sm"
            style={{ marginTop: 12 }}
            onClick={() => onSaveNotifications?.(notifDraft)}
          >
            Enregistrer
          </Button>
        </Card>
      </SubscreenPanel>
    </Screen>
  );
}
