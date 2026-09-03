import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { DocPanel } from '../molecules/DocPanel';
import { Explorer } from '../organisms/Explorer';
import { visibleRolesFor, type VisibilityNode } from '../../access/templateVisibility';
import type { TreeNodeData } from '../organisms/Explorer';
import type { ReactNode } from 'react';

export interface TemplateDetailScreenProps {
  templateName: string;
  templateDescription: string;
  /** Arborescence des TemplateFolder — pas de nœud racine synthétique (un
      Template n'a pas de documents à la racine, contrairement à une dataroom
      réelle, voir useTemplateTree). */
  tree: TreeNodeData[];
  /**
   * Rôles autorisés (`allowed_roles`) du DRAFT courant du tableau de droits,
   * par id — pas nécessairement enregistré côté serveur : c'est ce qui permet
   * aux pastilles de visibilité de refléter en direct un changement pas encore
   * sauvegardé (voir CLAUDE.md, "État réel du code", 02/09/2026).
   */
  allowedRolesByFolderId: Record<string, string[]>;
  loading?: boolean;
  error?: string | null;
  canManage: boolean;
  onBackToList: () => void;
  /** `parentId` absent = dossier créé à la racine du modèle. */
  onCreateFolder: (parentId: string | undefined) => void;
  /** Ouvre le popup de renommage (menu "⋮" de l'arbre) — les droits restent dans `accessRightsTab`. */
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  /** Contenu du mode "Droits d'accès" (même `AccessRightsTable` que DataroomDetailScreen). */
  accessRightsTab: ReactNode;
}

/** Adapte l'arbre de l'Explorer (TreeNodeData) au format attendu par
    templateVisibility.ts, en piochant allowed_roles dans le draft courant. */
function toVisibilityNodes(nodes: TreeNodeData[], allowedRolesByFolderId: Record<string, string[]>): VisibilityNode[] {
  return nodes.map(node => ({
    id: node.id,
    allowedRoles: allowedRolesByFolderId[node.id] ?? [],
    children: node.children ? toVisibilityNodes(node.children, allowedRolesByFolderId) : undefined,
  }));
}

const ROLE_BADGE_LABEL: Record<string, string> = { admin: 'A', membre: 'M', client: 'C' };

/**
 * Arborescence d'un modèle de dataroom (Template) — même organisme Explorer
 * que DataroomDetailScreen. Deux modes plutôt que des onglets (pas de tabs
 * existants sur cet écran) : "Arborescence" (navigation + pastilles de
 * visibilité par rôle, calculées en direct depuis le draft du tableau) et
 * "Droits d'accès" (le même `AccessRightsTable` que pour une vraie dataroom).
 * Renommer un dossier passe par le menu "⋮" (RenameFolderModal, câblé par
 * l'appelant), jamais par ce panneau — voir CLAUDE.md, 02/09/2026.
 */
export function TemplateDetailScreen({
  templateName,
  templateDescription,
  tree,
  allowedRolesByFolderId,
  loading,
  error,
  canManage,
  onBackToList,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  accessRightsTab,
}: TemplateDetailScreenProps) {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'tree' | 'access'>('tree');

  const activeNode = activeId ? findNode(tree, activeId) : undefined;
  const visibilityNodes = toVisibilityNodes(tree, allowedRolesByFolderId);

  function visibleRolesBadge(nodeId: string): string[] {
    const node = findVisibilityNode(visibilityNodes, nodeId);
    return node ? visibleRolesFor(node) : [];
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant={mode === 'tree' ? 'primary' : 'default'} onClick={() => setMode('tree')}>
            Arborescence
          </Button>
          <Button size="sm" variant={mode === 'access' ? 'primary' : 'default'} onClick={() => setMode('access')}>
            Droits d'accès
          </Button>
        </div>
      </div>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}

      {mode === 'access' ? (
        <div style={{ marginTop: 16 }}>{accessRightsTab}</div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Explorer
            tree={tree}
            activeId={activeId}
            onSelect={setActiveId}
            defaultOpenIds={tree.map(n => n.id)}
            onNodeMenu={canManage ? onRenameFolder : undefined}
            renderNodeExtra={node => {
              const roles = visibleRolesBadge(node.id);
              if (!roles.length) return null;
              return (
                <span style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
                  {roles.map(role => (
                    <Pill key={role} kind="neutral" icon={null}>
                      {ROLE_BADGE_LABEL[role] ?? role}
                    </Pill>
                  ))}
                </span>
              );
            }}
          >
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

              {!loading && tree.length > 0 && (
                <div className="tiny dim">
                  Les pastilles indiquent, pour chaque dossier, les rôles qui le verront une
                  fois le modèle appliqué (calculé en direct depuis l'onglet "Droits
                  d'accès", y compris les changements pas encore enregistrés). Le menu "⋮"
                  renomme un dossier ; les droits se règlent dans l'onglet "Droits d'accès".
                </div>
              )}
            </DocPanel>
          </Explorer>
        </div>
      )}
    </>
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

function findVisibilityNode(nodes: VisibilityNode[], id: string): VisibilityNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findVisibilityNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
