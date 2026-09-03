import { Pill } from '../atoms/Pill';
import { Toggle } from '../atoms/Toggle';
import { Modal } from './Modal';
import { roleLabel } from './officeRoles';
import type { AccessRestrictionSummary } from '../../api/endpoints';

export interface UserRestrictionsModalProps {
  open: boolean;
  username: string;
  userId: number;
  userRole: string;
  /** Toutes les restrictions actives de l'office — GET /api/access-restrictions/. */
  items: AccessRestrictionSummary[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  /** Coche/décoche CET utilisateur (user_ids) sur CETTE restriction — enregistré
      immédiatement, sans brouillon groupé (liste courte, une case = un aller-retour). */
  onToggle: (item: AccessRestrictionSummary, checked: boolean) => void;
}

const KIND_LABEL: Record<AccessRestrictionSummary['kind'], string> = {
  dataroom: 'Dataroom',
  folder: 'Dossier',
  document: 'Document',
};

/**
 * Restrictions d'accès qui nomment (ou pourraient nommer) cet utilisateur —
 * ouverte depuis le bouton "Restrictions" d'une ligne de l'annuaire. Reflète
 * le nouveau modèle double (02/09/2026, voir CLAUDE.md) : une case coche
 * l'appartenance à `user_ids` de cette restriction précise ; un badge en
 * lecture seule signale quand le RÔLE de l'utilisateur lui donne déjà accès
 * via `allowed_roles` — ce n'est pas un réglage par utilisateur, donc pas de
 * case pour ça, seulement l'information.
 */
export function UserRestrictionsModal({
  open,
  username,
  userId,
  userRole,
  items,
  loading,
  error,
  onClose,
  onToggle,
}: UserRestrictionsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Restrictions — ${username}`}>
      <div className="tiny dim">
        Chaque case ajoute ou retire <strong>{username}</strong> nommément de la restriction
        correspondante. Le rôle de cet utilisateur ({roleLabel(userRole)}) peut lui donner
        accès indépendamment, sans case à cocher ici — voir le badge « Accès via le rôle ».
      </div>

      {loading && <div className="tiny dim" style={{ marginTop: 10 }}>Chargement…</div>}

      {!loading && !items.length && (
        <div className="tiny dim" style={{ marginTop: 10 }}>
          Aucune restriction active dans cette étude pour le moment.
        </div>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 2 }}>
        {items.map(item => {
          const checked = item.user_ids.includes(userId);
          const viaRole = item.allowed_roles.includes(userRole);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div>{item.label}</div>
                <div className="tiny dim">{KIND_LABEL[item.kind]}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {viaRole && <Pill kind="success">Accès via le rôle</Pill>}
                <Toggle checked={checked} onChange={next => onToggle(item, next)} />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
