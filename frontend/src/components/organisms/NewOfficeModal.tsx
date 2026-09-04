import { useState } from 'react';
import type { SuperadminAccount } from '../../api/endpoints';
import { officeLoginUrl } from '../../hyperadmin/officeUrl';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

export type NewOfficeAdminMode = 'create' | 'attach';
export type NewOfficeAdminRole = 'admin' | 'superadmin';

export interface NewOfficeModalProps {
  open: boolean;
  /** Erreur renvoyée par l'API à la dernière tentative (sous-domaine déjà pris, mot de passe trop faible…). */
  error?: string | null;
  /** Comptes déjà superadmin quelque part — voir SuperadminAccount. N'affiche
      un sélecteur que si non vide ET rôle "superadmin" ET mode "attach". */
  superadmins: SuperadminAccount[];
  onClose: () => void;
  onSubmit: (data: {
    subdomain: string;
    name: string;
    admin_mode: NewOfficeAdminMode;
    admin_username: string;
    admin_password?: string;
    admin_role: NewOfficeAdminRole;
  }) => void;
}

/**
 * Création d'un office ET de son premier admin, dans le même geste que le
 * backend (POST /api/hyperadmin/offices/ fait les deux en un seul appel — pas
 * de création partielle en cas d'erreur). Même bascule create/attach que
 * OfficeUserModal pour l'admin : 'attach' rattache un compte EXISTANT par son
 * nom exact, sans annuaire général à parcourir (même parti pris de sécurité
 * que attach_office_user_view) — SAUF pour les comptes déjà superadmin
 * quelque part (voir `superadmins`), où un sélecteur dédié est proposé : un
 * hyperadmin a par construction déjà tous les droits sur tous les offices,
 * cette liste ne lui expose donc rien de plus que ce qu'il verrait déjà en
 * parcourant chaque office un par un (voir hyperadmin_superadmins_view).
 */
export function NewOfficeModal({ open, error, superadmins, onClose, onSubmit }: NewOfficeModalProps) {
  const [subdomain, setSubdomain] = useState('');
  const [name, setName] = useState('');
  const [adminMode, setAdminMode] = useState<NewOfficeAdminMode>('create');
  const [adminRole, setAdminRole] = useState<NewOfficeAdminRole>('admin');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const creating = adminMode === 'create';
  const showSuperadminPicker = adminMode === 'attach' && adminRole === 'superadmin' && superadmins.length > 0;

  function reset() {
    setSubdomain('');
    setName('');
    setAdminMode('create');
    setAdminRole('admin');
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
      admin_role: adminRole,
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

      <Field label="Rôle">
        <Select value={adminRole} onChange={e => setAdminRole(e.target.value as NewOfficeAdminRole)}>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </Select>
      </Field>

      {showSuperadminPicker && (
        <Field label="Comptes déjà superadmin">
          <div className="tiny dim" style={{ marginBottom: 6 }}>
            Cliquer pour reprendre une identité déjà partagée entre offices plutôt que
            d'en créer une nouvelle.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
            {superadmins.map(s => (
              <button
                key={s.user_id}
                type="button"
                onClick={() => setAdminUsername(s.username)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: adminUsername === s.username ? 'var(--brass-100)' : 'var(--surface)',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <span className="tiny" style={{ fontWeight: 600 }}>
                  {s.username}
                </span>
                <span className="tiny dim">{s.offices.map(o => o.subdomain).join(', ')}</span>
              </button>
            ))}
          </div>
        </Field>
      )}

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
