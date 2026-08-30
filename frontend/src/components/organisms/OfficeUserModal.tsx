import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';
import { roleLabel } from './officeRoles';

export type OfficeUserModalMode = 'create' | 'attach';

export interface OfficeUserModalProps {
  open: boolean;
  /**
   * 'create' : nouveau compte (POST /api/office-users/), mot de passe exigé et
   * validé par Django. 'attach' : compte qui existe déjà ailleurs
   * (POST /api/office-users/attach/), rattaché par son nom EXACT.
   */
  mode: OfficeUserModalMode;
  /** Rôles proposés — déjà bornés au rang de l'appelant, voir officeRoles. */
  roles: string[];
  /** Erreur renvoyée par l'API à la dernière tentative (nom déjà pris, mot de passe trop faible…). */
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: { username: string; password: string; role: string }) => void;
}

/**
 * Ajout d'un utilisateur à l'étude, dans ses deux formes.
 *
 * Le mode 'attach' n'offre volontairement aucune recherche ni autocomplétion :
 * le backend impose le nom exact et répond « utilisateur introuvable » sans dire
 * si le compte existe ailleurs. Un champ de recherche ici transformerait cet
 * écran en annuaire inter-études — précisément le point de sécurité que le POC
 * a décidé de ne pas reproduire (voir attach_office_user_view).
 */
export function OfficeUserModal({ open, mode, roles, error, onClose, onSubmit }: OfficeUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(roles[roles.length - 1] ?? '');
  const creating = mode === 'create';

  function handleSubmit() {
    const trimmed = username.trim();
    if (!trimmed || !role) return;
    if (creating && !password) return;
    onSubmit({ username: trimmed, password, role });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? 'Nouvel utilisateur' : 'Rattacher un compte existant'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {creating ? 'Créer le compte' : 'Rattacher'}
          </Button>
        </>
      }
    >
      <div className="tiny dim">
        {creating
          ? "Le compte est créé puis rattaché à cette étude. Le mot de passe doit satisfaire les règles de Django, sans quoi l'API le refuse."
          : "Le compte doit déjà exister. Saisissez son nom d'utilisateur exact : il n'y a pas d'annuaire à parcourir entre études."}
      </div>

      <Field label="Nom d'utilisateur" style={{ marginTop: 10 }}>
        <TextInput
          placeholder="Ex. m.dupont"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
      </Field>

      {creating && (
        <Field label="Mot de passe">
          <TextInput
            type="password"
            placeholder="Au moins 8 caractères, pas trop courant"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </Field>
      )}

      <Field label="Rôle dans l'étude">
        <Select value={role} onChange={e => setRole(e.target.value)}>
          {roles.map(r => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
      </Field>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
