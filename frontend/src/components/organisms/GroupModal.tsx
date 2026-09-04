import { useState } from 'react';
import type { GroupCategory } from '../../api/endpoints';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';
import type { AccessEditorUser } from './NamedUsersEditor';

export interface GroupModalProps {
  open: boolean;
  /** 'edit' pré-remplit les champs à partir de `initial` et change les libellés. */
  mode: 'create' | 'edit';
  /**
   * Valeurs de départ en mode 'edit' — lues UNE SEULE FOIS au montage
   * (useState). L'appelant doit remonter le composant (prop `key` distincte)
   * en passant d'un groupe à l'autre, sinon les champs garderaient ceux du
   * précédent — même convention que NewTemplateModal.
   */
  initial?: { name: string; category: GroupCategory; userIds: number[] };
  /** Annuaire de l'office — sert au choix des membres du groupe. */
  officeUsers: AccessEditorUser[];
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: { name: string; category: GroupCategory; userIds: number[] }) => void;
}

const CATEGORY_OPTIONS: { value: GroupCategory; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'membre', label: 'Membre' },
  { value: 'client', label: 'Client' },
];

/**
 * Création ou modification d'un groupe de droits — nom, catégorie
 * d'affichage (voir GroupsScreen) et membres. `category` ne restreint pas
 * qui peut être coché ci-dessous : un membre de rôle "membre" peut très bien
 * rejoindre un groupe classé "Admin", voir models.Group côté serveur.
 */
export function GroupModal({ open, mode, initial, officeUsers, error, onClose, onSubmit }: GroupModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<GroupCategory>(initial?.category ?? 'membre');
  const [userIds, setUserIds] = useState<number[]>(initial?.userIds ?? []);
  const editing = mode === 'edit';

  function toggleUser(userId: number, checked: boolean) {
    setUserIds(prev => (checked ? [...prev, userId] : prev.filter(id => id !== userId)));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, category, userIds });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier le groupe' : 'Nouveau groupe'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? 'Enregistrer' : 'Créer le groupe'}
          </Button>
        </>
      }
    >
      <Field label="Nom du groupe">
        <TextInput
          placeholder="Ex. Notaires associés"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Catégorie">
        <Select value={category} onChange={e => setCategory(e.target.value as GroupCategory)}>
          {CATEGORY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Membres">
        {officeUsers.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {officeUsers.map(u => (
              <label
                key={u.userId}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}
              >
                <input
                  type="checkbox"
                  checked={userIds.includes(u.userId)}
                  onChange={e => toggleUser(u.userId, e.target.checked)}
                />
                <span className="tiny">{u.username}</span>
                <span className="tiny dim">{u.role}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="tiny dim">Aucun membre dans l'annuaire de l'étude pour le moment.</div>
        )}
      </Field>
      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
