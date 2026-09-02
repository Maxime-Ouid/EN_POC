import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

export interface NewOfficeModalProps {
  open: boolean;
  /** Vrai pendant l'appel : la création provisionne une base, ce n'est pas instantané. */
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (data: {
    subdomain: string;
    name: string;
    adminMode: 'create' | 'attach';
    adminUsername: string;
    adminPassword?: string;
  }) => void;
}

/**
 * Ouverture d'une étude sur la plateforme — réservé aux hyperadmins Notantis.
 *
 * Le premier administrateur est demandé ici, et non dans un second temps,
 * parce que le backend crée les deux dans le même appel : un office sans
 * administrateur serait une étude que personne ne peut ouvrir, et l'API refuse
 * justement de la laisser exister (validation complète avant la moindre
 * écriture, voir hyperadmin_offices_view).
 *
 * Le mode « rattacher » n'offre aucune recherche : comme pour l'annuaire d'une
 * étude, le serveur exige le nom exact et ne dit pas si un compte existe
 * ailleurs — un champ de recherche ici ferait de cet écran un annuaire de toute
 * la plateforme.
 */
export function NewOfficeModal({ open, busy, error, onClose, onCreate }: NewOfficeModalProps) {
  const [subdomain, setSubdomain] = useState('');
  const [name, setName] = useState('');
  const [adminMode, setAdminMode] = useState<'create' | 'attach'>('create');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (!open) {
      setSubdomain('');
      setName('');
      setAdminMode('create');
      setAdminUsername('');
      setAdminPassword('');
    }
  }, [open]);

  const creating = adminMode === 'create';
  const ready =
    subdomain.trim() && name.trim() && adminUsername.trim() && (!creating || adminPassword);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ouvrir une étude"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="primary"
            disabled={!ready || busy}
            onClick={() =>
              onCreate({
                subdomain: subdomain.trim().toLowerCase(),
                name: name.trim(),
                adminMode,
                adminUsername: adminUsername.trim(),
                adminPassword: creating ? adminPassword : undefined,
              })
            }
          >
            {busy ? 'Provisionnement…' : "Ouvrir l'étude"}
          </Button>
        </>
      }
    >
      <div className="tiny dim">
        L'étude reçoit sa propre base de données, créée et migrée pendant cet appel :
        comptez quelques secondes. Le sous-domaine sert d'adresse
        (<span className="mono">sous-domaine.localhost</span> en développement) et ne
        se change pas ensuite.
      </div>

      <FieldRow>
        <Field label="Sous-domaine" style={{ marginTop: 10 }}>
          <TextInput
            placeholder="Ex. briand-hamon"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Nom de l'étude" style={{ marginTop: 10 }}>
          <TextInput
            placeholder="Ex. Briand & Hamon"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="Premier administrateur">
        <Select value={adminMode} onChange={e => setAdminMode(e.target.value as 'create' | 'attach')}>
          <option value="create">Créer un nouveau compte</option>
          <option value="attach">Rattacher un compte existant</option>
        </Select>
      </Field>

      <Field label="Nom d'utilisateur">
        <TextInput
          placeholder="Ex. c.dumont"
          value={adminUsername}
          onChange={e => setAdminUsername(e.target.value)}
        />
      </Field>

      {creating && (
        <Field label="Mot de passe">
          <TextInput
            type="password"
            placeholder="Au moins 8 caractères, pas trop courant"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
          />
        </Field>
      )}

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
