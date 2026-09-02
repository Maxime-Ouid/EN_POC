import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Screen } from '../atoms/Screen';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { DocPanel } from '../molecules/DocPanel';
import { Field } from '../molecules/Field';
import { Explorer } from '../organisms/Explorer';
import { OFFICE_ROLES, roleLabel } from '../organisms/officeRoles';
import type { TreeNodeData } from '../organisms/Explorer';

export interface TemplateDetailScreenProps {
  templateName: string;
  templateDescription: string;
  /** Arborescence des TemplateFolder — pas de nœud racine synthétique (un
      Template n'a pas de documents à la racine, contrairement à une dataroom
      réelle, voir useTemplateTree). */
  tree: TreeNodeData[];
  /** Rôles voyant CE dossier par défaut une fois le modèle appliqué (visible_to_roles), par id. */
  rolesByFolderId: Record<string, string[]>;
  loading?: boolean;
  error?: string | null;
  canManage: boolean;
  onBackToList: () => void;
  /** `parentId` absent = dossier créé à la racine du modèle. */
  onCreateFolder: (parentId: string | undefined) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSetFolderRoles: (folderId: string, roles: string[]) => void;
}

/**
 * Arborescence d'un modèle de dataroom (Template) — même organisme Explorer
 * que DataroomDetailScreen, mais un panneau latéral bien plus simple : pas de
 * documents, pas d'onglets Q&R/Membres/Historique (aucun de ces concepts
 * n'existe pour un Template). Sélectionner un dossier permet de le renommer,
 * de le supprimer, et de régler les rôles qui le verront par défaut une fois
 * le modèle appliqué — la résolution en utilisateurs réels ne se fait qu'à
 * ce moment-là (_apply_template, côté serveur), jamais ici.
 */
export function TemplateDetailScreen({
  templateName,
  templateDescription,
  tree,
  rolesByFolderId,
  loading,
  error,
  canManage,
  onBackToList,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetFolderRoles,
}: TemplateDetailScreenProps) {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [draftName, setDraftName] = useState('');

  const activeNode = activeId ? findNode(tree, activeId) : undefined;

  // Un dossier supprimé (ou renommé sous un id différent, ce qui n'arrive
  // jamais ici) disparaît de l'arbre au prochain rafraîchissement : la
  // sélection retombe alors sur « rien », plutôt que de garder un id fantôme
  // qui ferait pointer "Nouveau sous-dossier" vers un parent qui n'existe plus.
  useEffect(() => {
    if (activeId && !activeNode) setActiveId(undefined);
  }, [activeId, activeNode]);

  // Repart du nom serveur à chaque changement de sélection — pas de fuite d'un
  // brouillon non enregistré d'un dossier à l'autre.
  useEffect(() => {
    setDraftName(activeNode?.label ?? '');
  }, [activeNode?.id, activeNode?.label]);

  const activeRoles = activeId ? (rolesByFolderId[activeId] ?? []) : [];

  function saveName() {
    if (!activeId) return;
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === activeNode?.label) return;
    onRenameFolder(activeId, trimmed);
  }

  function toggleRole(role: string, checked: boolean) {
    if (!activeId) return;
    const next = checked ? [...activeRoles, role] : activeRoles.filter(r => r !== role);
    onSetFolderRoles(activeId, next);
  }

  return (
    <Screen>
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
      </div>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Explorer tree={tree} activeId={activeId} onSelect={setActiveId} defaultOpenIds={tree.map(n => n.id)}>
          <DocPanel
            title={activeNode ? activeNode.label : 'Racine du modèle'}
            actions={
              canManage ? (
                <>
                  <Button size="sm" onClick={() => onCreateFolder(activeId)}>
                    <Icon id="plus" />
                    Nouveau sous-dossier
                  </Button>
                  {activeNode && (
                    <Button size="sm" variant="ghost" onClick={() => onDeleteFolder(activeNode.id)}>
                      Supprimer ce dossier
                    </Button>
                  )}
                </>
              ) : undefined
            }
          >
            {loading && <div className="tiny dim">Chargement de l'arborescence…</div>}

            {!loading && !tree.length && (
              <div className="tiny dim">
                Ce modèle n'a encore aucun dossier. {canManage && 'Créez-en un à la racine.'}
              </div>
            )}

            {!loading && !activeNode && tree.length > 0 && (
              <div className="tiny dim">
                Sélectionnez un dossier pour le renommer, régler ses rôles visibles, ou le
                supprimer.
              </div>
            )}

            {!loading && activeNode && (
              <>
                <Field label="Nom du dossier">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <TextInput
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      disabled={!canManage}
                    />
                    {canManage && (
                      <Button size="sm" onClick={saveName}>
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </Field>

                <div style={{ marginTop: 16, fontWeight: 600 }}>Rôles visibles par défaut</div>
                <div className="tiny dim" style={{ marginTop: 4 }}>
                  Aucun rôle coché : ce dossier suit l'accès par défaut de l'office une fois le
                  modèle appliqué (ouvert à tous sauf aux clients). Cocher un ou plusieurs
                  rôles restreint ce dossier, à l'application du modèle, aux membres de
                  l'office ayant l'un de ces rôles — la résolution en comptes réels se fait à
                  ce moment-là, pas ici.
                </div>
                <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
                  {OFFICE_ROLES.map(role => (
                    <div
                      key={role}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span>{roleLabel(role)}</span>
                      <Toggle
                        checked={activeRoles.includes(role)}
                        disabled={!canManage}
                        onChange={next => toggleRole(role, next)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </DocPanel>
        </Explorer>
      </div>
    </Screen>
  );
}

function findNode(nodes: TreeNodeData[], id: string): TreeNodeData | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
