import type { ReactNode } from 'react';
import { Button } from '../atoms/Button';
import { NamedUsersEditor, type AccessEditorUser } from './NamedUsersEditor';

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

export interface AccessRightsTableProps {
  rows: AccessRightsRow[];
  officeUsers: AccessEditorUser[];
  onChangeRow: (rowId: string, next: { allowedRoles: string[]; userIds: number[] }) => void;
  loading?: boolean;
  error?: string | null;
  /**
   * Rôles EFFECTIVEMENT accordés à cette ligne via un descendant (dossier ou
   * pièce) qui les coche explicitement — voir `access/effectiveRoles.ts`.
   * Une case de rôle qu'un descendant accorde déjà s'affiche cochée et
   * DÉSACTIVÉE (grisée) : ça reste un pur affichage, jamais une écriture sur
   * cette ligne (voir CLAUDE.md, "État réel du code").
   */
  effectiveRoles?: (row: AccessRightsRow) => string[];
  /** Colonne "Actions" finale, affichée UNIQUEMENT si cette prop est
      fournie (l'écran d'une vraie dataroom ne la passe pas — le
      renommage/la création/la suppression restent dans son Explorer). */
  renderRowActions?: (row: AccessRightsRow) => ReactNode;
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
export function AccessRightsTable({
  rows, officeUsers, onChangeRow, loading, error, effectiveRoles, renderRowActions,
}: AccessRightsTableProps) {
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
            {renderRowActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const inheritedRoles = effectiveRoles?.(row) ?? [];
            return (
            <tr key={row.id}>
              <td style={{ paddingLeft: 12 + row.depth * 16 }}>{row.label}</td>
              {ROLE_COLUMNS.map(col => {
                const direct = row.allowedRoles.includes(col.role);
                const inherited = !direct && inheritedRoles.includes(col.role);
                return (
                  <td key={col.role}>
                    <input
                      type="checkbox"
                      aria-label={`${col.label} — ${row.label}`}
                      checked={direct || inherited}
                      disabled={inherited}
                      title={inherited ? "Accordé par un sous-dossier ou une pièce — modifiable là où il est réellement accordé" : undefined}
                      onChange={e => toggleRole(row, col.role, e.target.checked)}
                    />
                  </td>
                );
              })}
              <td>
                <NamedUsersEditor
                  userIds={row.userIds}
                  officeUsers={officeUsers}
                  onAdd={userId => addUser(row, userId)}
                  onRemove={userId => removeUser(row, userId)}
                  targetLabel={row.label}
                />
              </td>
              {renderRowActions && <td>{renderRowActions(row)}</td>}
            </tr>
            );
          })}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={2 + ROLE_COLUMNS.length + (renderRowActions ? 1 : 0)} className="dim">
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
