import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { AccessRightsTable, type AccessRightsRow } from '../organisms/AccessRightsTable';
import type { AccessEditorGroup } from '../organisms/GroupsEditor';
import type { AccessEditorUser } from '../organisms/NamedUsersEditor';
import type { ReactNode } from 'react';

export interface TemplateDetailScreenProps {
  templateName: string;
  templateDescription: string;
  /** Déjà aplati (une ligne par TemplateFolder) et fusionné au brouillon
      courant par l'appelant (App.tsx) — même forme que pour une vraie
      dataroom (voir `AccessRightsTable`). */
  rows: AccessRightsRow[];
  officeUsers: AccessEditorUser[];
  groups: AccessEditorGroup[];
  onChangeRow: (rowId: string, next: { allowedRoles: string[]; userIds: number[]; groupIds: number[] }) => void;
  /** Rôles EFFECTIVEMENT accordés à chaque ligne (id "folder:<id>") via un
      sous-dossier qui les coche explicitement, calculés en direct depuis le
      brouillon — voir `access/effectiveRoles.ts::templateEffectiveRoles`.
      Grise la case correspondante dans `AccessRightsTable`, sans jamais
      l'écrire sur la ligne elle-même. */
  effectiveRoles: Record<string, string[]>;
  loading?: boolean;
  error?: string | null;
  canManage: boolean;
  onBackToList: () => void;
  /** Dossier créé à la racine du modèle. */
  onCreateRootFolder: () => void;
  /** Dossier créé DANS la ligne visée. */
  onCreateFolder: (parentRowId: string) => void;
  onRenameFolder: (rowId: string) => void;
  onDeleteFolder: (rowId: string) => void;
  /** Barre Enregistrer/Annuler du brouillon de droits — construite par
      l'appelant, qui seul connaît le décompte de lignes modifiées. */
  accessSaveBar: ReactNode;
}

/**
 * Arborescence d'un modèle de dataroom (Template) — plus d'Explorer ni de
 * toggle Arborescence/Droits d'accès (retirés le 03/09/2026, voir CLAUDE.md,
 * "État réel du code") : l'écran EST directement `AccessRightsTable`, une
 * ligne par dossier, les droits de CHAQUE ligne visibles sans sélection
 * préalable — même composant que pour une vraie dataroom (garantit le même
 * visuel). Renommer/créer un sous-dossier/supprimer sont des actions PAR
 * LIGNE (`renderRowActions`), il n'y a plus de notion de "nœud sélectionné".
 */
export function TemplateDetailScreen({
  templateName,
  templateDescription,
  rows,
  officeUsers,
  groups,
  onChangeRow,
  effectiveRoles,
  loading,
  error,
  canManage,
  onBackToList,
  onCreateRootFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  accessSaveBar,
}: TemplateDetailScreenProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Button size="sm" variant="ghost" onClick={onBackToList}>
            <Icon id="arrleft" />
            Modèles
          </Button>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 6 }}>
            {templateName}
          </div>
          {templateDescription && <div className="tiny dim">{templateDescription}</div>}
        </div>
        {canManage && (
          <Button size="sm" onClick={onCreateRootFolder}>
            <Icon id="plus" />
            Nouveau dossier
          </Button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>{accessSaveBar}</div>

      {!loading && !error && !rows.length ? (
        <div className="tiny dim" style={{ marginTop: 16 }}>
          Ce modèle n'a encore aucun dossier. {canManage && 'Créez-en un à la racine.'}
        </div>
      ) : (
        <>
          {!loading && rows.length > 0 && (
            <div className="tiny dim" style={{ marginTop: 16 }}>
              Une case de rôle grisée signifie que ce rôle a déjà accès via un
              sous-dossier — la retirer se fait là où elle est réellement
              accordée.
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <AccessRightsTable
              rows={rows}
              officeUsers={officeUsers}
              groups={groups}
              onChangeRow={onChangeRow}
              loading={loading}
              error={error}
              effectiveRoles={row => effectiveRoles[row.id] ?? []}
              renderRowActions={
                canManage
                  ? row => (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Nouveau sous-dossier dans ${row.label}`}
                          onClick={() => onCreateFolder(row.id)}
                        >
                          <Icon id="plus" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Renommer ${row.label}`}
                          onClick={() => onRenameFolder(row.id)}
                        >
                          <Icon id="dots" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Supprimer ${row.label}`}
                          onClick={() => onDeleteFolder(row.id)}
                        >
                          <Icon id="x" />
                        </Button>
                      </div>
                    )
                  : undefined
              }
            />
          </div>
        </>
      )}
    </>
  );
}
