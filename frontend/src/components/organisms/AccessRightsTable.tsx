import type { ReactNode } from 'react';
import { GroupsEditor, type AccessEditorGroup } from './GroupsEditor';
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
  /** Groupes cochés (troisième critère d'accès, ajouté le 04/09/2026 — voir
      CLAUDE.md et backend/datarooms/models.py::Group). */
  groupIds: number[];
}

export interface AccessRightsTableProps {
  rows: AccessRightsRow[];
  officeUsers: AccessEditorUser[];
  /** Catalogue de groupes de l'office — alimente la colonne "Groupes". */
  groups: AccessEditorGroup[];
  onChangeRow: (rowId: string, next: { allowedRoles: string[]; userIds: number[]; groupIds: number[] }) => void;
  loading?: boolean;
  error?: string | null;
  /**
   * Groupes EFFECTIVEMENT accordés à cette ligne via un descendant (dossier
   * ou pièce) qui les coche explicitement — voir
   * `access/effectiveRoles.ts::dataroomEffectiveGroups`/`templateEffectiveGroups`.
   * Une puce de groupe qu'un descendant accorde déjà s'affiche grisée, sans
   * croix de retrait : ça reste un pur affichage, jamais une écriture sur
   * cette ligne (voir CLAUDE.md, "État réel du code").
   *
   * Remplace `effectiveRoles` (retiré le 04/09/2026, "les groupes remplacent
   * les rôles") : ce tableau n'affiche plus les colonnes Admin/Membre/Client —
   * `allowedRoles` reste un champ valide côté serveur (restrictions déjà
   * configurées avant ce chantier continuent de fonctionner), simplement plus
   * éditable depuis cet écran.
   */
  effectiveGroups?: (row: AccessRightsRow) => number[];
  /** Colonne "Actions" finale, affichée UNIQUEMENT si cette prop est
      fournie (l'écran d'une vraie dataroom ne la passe pas — le
      renommage/la création/la suppression restent dans son Explorer). */
  renderRowActions?: (row: AccessRightsRow) => ReactNode;
}

/**
 * Tableau de droits d'accès — un composant réutilisé tel quel pour une vraie
 * dataroom (dossiers + documents) ET pour un Template (dossiers seulement) :
 * une ligne par élément, un champ pour ajouter des utilisateurs nommés, une
 * colonne "Groupes" — LE mécanisme de droits sur le contenu depuis le
 * 04/09/2026 ("les groupes remplacent les rôles"), les cases Admin/Membre/
 * Client ayant disparu de cet écran (voir AccessRightsTableProps.effectiveGroups).
 * CONTRÔLÉ — aucun état réseau ici, aucune requête par case cochée :
 * l'appelant possède le brouillon (voir useAccessRightsDraft) et décide seul
 * du moment où il l'enregistre.
 */
export function AccessRightsTable({
  rows, officeUsers, groups, onChangeRow, loading, error, effectiveGroups, renderRowActions,
}: AccessRightsTableProps) {
  function addUser(row: AccessRightsRow, userId: number) {
    if (row.userIds.includes(userId)) return;
    onChangeRow(row.id, { allowedRoles: row.allowedRoles, userIds: [...row.userIds, userId], groupIds: row.groupIds });
  }

  function removeUser(row: AccessRightsRow, userId: number) {
    onChangeRow(row.id, {
      allowedRoles: row.allowedRoles, userIds: row.userIds.filter(id => id !== userId), groupIds: row.groupIds,
    });
  }

  function addGroup(row: AccessRightsRow, groupId: number) {
    if (row.groupIds.includes(groupId)) return;
    onChangeRow(row.id, { allowedRoles: row.allowedRoles, userIds: row.userIds, groupIds: [...row.groupIds, groupId] });
  }

  function removeGroup(row: AccessRightsRow, groupId: number) {
    onChangeRow(row.id, {
      allowedRoles: row.allowedRoles, userIds: row.userIds, groupIds: row.groupIds.filter(id => id !== groupId),
    });
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Élément</th>
            <th>Utilisateurs nommés</th>
            <th>Groupes</th>
            {renderRowActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const inheritedGroupIds = effectiveGroups?.(row) ?? [];
            return (
            <tr key={row.id}>
              <td style={{ paddingLeft: 12 + row.depth * 16 }}>{row.label}</td>
              <td>
                <NamedUsersEditor
                  userIds={row.userIds}
                  officeUsers={officeUsers}
                  onAdd={userId => addUser(row, userId)}
                  onRemove={userId => removeUser(row, userId)}
                  targetLabel={row.label}
                />
              </td>
              <td>
                <GroupsEditor
                  groupIds={row.groupIds}
                  groups={groups}
                  onAdd={groupId => addGroup(row, groupId)}
                  onRemove={groupId => removeGroup(row, groupId)}
                  targetLabel={row.label}
                  inheritedGroupIds={inheritedGroupIds}
                />
              </td>
              {renderRowActions && <td>{renderRowActions(row)}</td>}
            </tr>
            );
          })}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={3 + (renderRowActions ? 1 : 0)} className="dim">
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
