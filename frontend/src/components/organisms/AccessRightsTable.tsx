import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Tag } from '../atoms/Tag';

export type AccessRightsRowKind = 'dataroom' | 'folder' | 'document';

export interface AccessRightsRow {
  /** Clé stable : "dataroom", "folder:12", "document:7". */
  id: string;
  label: string;
  /** Niveau d'indentation dans l'arborescence (0 = racine). */
  depth: number;
  kind: AccessRightsRowKind;
  allowedRoles: string[];
  userIds: number[];
}

export interface AccessRightsTableUser {
  userId: number;
  username: string;
  role: string;
}

export interface AccessRightsTableProps {
  rows: AccessRightsRow[];
  officeUsers: AccessRightsTableUser[];
  onChangeRow: (rowId: string, next: { allowedRoles: string[]; userIds: number[] }) => void;
  loading?: boolean;
  error?: string | null;
}

/** Superadmin exclu à dessein : bypass systématique côté serveur
    (_user_can_access), jamais une case à cocher — voir CLAUDE.md. */
const ROLE_COLUMNS: { role: string; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'membre', label: 'Membre' },
  { role: 'client', label: 'Client' },
];

/**
 * Tableau de droits d'accès — un composant réutilisé tel quel pour une vraie
 * dataroom (dossiers + documents) ET pour un Template (dossiers seulement) :
 * une ligne par élément, trois cases de rôle (jamais superadmin, toujours
 * ouvert), un champ pour ajouter des utilisateurs nommés, un bouton "Tout
 * cocher" par colonne. CONTRÔLÉ — aucun état réseau ici, aucune requête par
 * case cochée : l'appelant possède le brouillon (voir useAccessRightsDraft) et
 * décide seul du moment où il l'enregistre.
 */
export function AccessRightsTable({ rows, officeUsers, onChangeRow, loading, error }: AccessRightsTableProps) {
  const usersById = new Map(officeUsers.map(u => [u.userId, u]));

  function toggleRole(row: AccessRightsRow, role: string, checked: boolean) {
    const allowedRoles = checked ? [...row.allowedRoles, role] : row.allowedRoles.filter(r => r !== role);
    onChangeRow(row.id, { allowedRoles, userIds: row.userIds });
  }

  function checkAllForRole(role: string) {
    for (const row of rows) {
      if (!row.allowedRoles.includes(role)) {
        onChangeRow(row.id, { allowedRoles: [...row.allowedRoles, role], userIds: row.userIds });
      }
    }
  }

  function addUser(row: AccessRightsRow, userId: number) {
    if (row.userIds.includes(userId)) return;
    onChangeRow(row.id, { allowedRoles: row.allowedRoles, userIds: [...row.userIds, userId] });
  }

  function removeUser(row: AccessRightsRow, userId: number) {
    onChangeRow(row.id, { allowedRoles: row.allowedRoles, userIds: row.userIds.filter(id => id !== userId) });
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Élément</th>
            {ROLE_COLUMNS.map(col => (
              <th key={col.role}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {col.label}
                  <Button size="sm" variant="ghost" onClick={() => checkAllForRole(col.role)}>
                    Tout cocher
                  </Button>
                </div>
              </th>
            ))}
            <th>Utilisateurs nommés</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const availableUsers = officeUsers.filter(u => !row.userIds.includes(u.userId));
            return (
              <tr key={row.id}>
                <td style={{ paddingLeft: 12 + row.depth * 16 }}>{row.label}</td>
                {ROLE_COLUMNS.map(col => (
                  <td key={col.role}>
                    <input
                      type="checkbox"
                      aria-label={`${col.label} — ${row.label}`}
                      checked={row.allowedRoles.includes(col.role)}
                      onChange={e => toggleRole(row, col.role, e.target.checked)}
                    />
                  </td>
                ))}
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: row.userIds.length ? 6 : 0 }}>
                    {row.userIds.map(id => (
                      <Tag
                        key={id}
                        plain
                        onRemove={() => removeUser(row, id)}
                        removeLabel={`Retirer ${usersById.get(id)?.username ?? `#${id}`}`}
                      >
                        {usersById.get(id)?.username ?? `#${id}`}
                      </Tag>
                    ))}
                  </div>
                  {availableUsers.length > 0 && (
                    <Select
                      small
                      auto
                      value=""
                      aria-label={`Ajouter un utilisateur nommé à ${row.label}`}
                      onChange={e => {
                        if (e.target.value) addUser(row, Number(e.target.value));
                      }}
                    >
                      <option value="">+ Ajouter…</option>
                      {availableUsers.map(u => (
                        <option key={u.userId} value={u.userId}>
                          {u.username}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
              </tr>
            );
          })}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={2 + ROLE_COLUMNS.length} className="dim">
                Rien à afficher.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {loading && (
        <div className="tiny dim" style={{ marginTop: 8 }}>
          Chargement…
        </div>
      )}
      {error && (
        <div className="tiny" style={{ marginTop: 8, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
