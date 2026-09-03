import { useState } from 'react';
import { officeLoginUrl } from '../../hyperadmin/officeUrl';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export type NewOfficeAdminMode = 'create' | 'attach';

export interface NewOfficeModalProps {
  open: boolean;
  /** Erreur renvoyée par l'API à la dernière tentative (sous-domaine déjà pris, mot de passe trop faible…). */
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    subdomain: string;
    name: string;
    admin_mode: NewOfficeAdminMode;
    admin_username: string;
    admin_password?: string;
  }) => void;
}

/**
 * Création d'un office ET de son premier admin, dans le même geste que le
 * backend (POST /api/hyperadmin/offices/ fait les deux en un seul appel — pas
 * de création partielle en cas d'erreur). Même bascule create/attach que
 * OfficeUserModal pour l'admin : 'attach' rattache un compte EXISTANT par son
 * nom exact, sans annuaire à parcourir (même parti pris de sécurité que
 * attach_office_user_view).
 */
export function NewOfficeModal({ open, error, onClose, onSubmit }: NewOfficeModalProps) {
  const [subdomain, setSubdomain] = useState('');
  const [name, setName] = useState('');
  const [adminMode, setAdminMode] = useState<NewOfficeAdminMode>('create');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const creating = adminMode === 'create';

  function reset() {
    setSubdomain('');
    setName('');
    setAdminMode('create');
    setAdminUsername('');
    setAdminPassword('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    const trimmedSubdomain = subdomain.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedAdmin = adminUsername.trim();
    if (!trimmedSubdomain || !trimmedName || !trimmedAdmin) return;
    if (creating && !adminPassword) return;
    onSubmit({
      subdomain: trimmedSubdomain,
      name: trimmedName,
      admin_mode: adminMode,
      admin_username: trimmedAdmin,
      admin_password: creating ? adminPassword : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nouvel office"
      footer={
        <>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            Créer l'office
          </Button>
        </>
      }
    >
      <div className="tiny dim">
        Provisionne aussitôt la base de l'office (isolation physique, comme les autres
        études) et rattache son premier admin — pas de création en deux temps.
      </div>

      <Field label="Sous-domaine" style={{ marginTop: 10 }}>
        <TextInput
          placeholder="Ex. notaires-durand"
          value={subdomain}
          onChange={e => setSubdomain(e.target.value)}
          autoFocus
        />
        {/* Aperçu en direct de l'adresse de connexion — le certificat local ne
            couvre qu'un wildcard sous .office.localhost, voir officeUrl.ts. */}
        <div className="tiny dim" style={{ marginTop: 4 }}>
          {subdomain.trim()
            ? `Accessible sur ${officeLoginUrl(subdomain.trim().toLowerCase())}`
            : "L'office sera accessible sur <sous-domaine>.office.localhost"}
        </div>
      </Field>

      <Field label="Nom de l'étude">
        <TextInput
          placeholder="Ex. Office C - Étude Dupont"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </Field>

      <Field label="Premier administrateur">
        <Select value={adminMode} onChange={e => setAdminMode(e.target.value as NewOfficeAdminMode)}>
          <option value="create">Nouveau compte</option>
          <option value="attach">Compte existant</option>
        </Select>
      </Field>

      <Field label="Nom d'utilisateur">
        <TextInput
          placeholder="Ex. m.dupont"
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
