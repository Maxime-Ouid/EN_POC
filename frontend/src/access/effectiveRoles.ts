/* ===========================================================================
   Rôles EFFECTIVEMENT accordés à chaque ligne du tableau de droits — un rôle
   compte dès qu'il est coché explicitement sur cette ligne OU sur un
   descendant (dossier ou pièce), quelle que soit la profondeur : donner
   Admin à un sous-dossier rend son parent (et le parent de son parent, etc.)
   effectivement accessible aux Admins, exactement comme on s'attendrait à
   pouvoir "remonter" jusqu'à un élément auquel on a accès.

   Volontairement DIFFÉRENT de _user_can_access/_level_visible côté serveur :
   ceux-là traitent aussi "aucune restriction nulle part" comme un accès
   ouvert par défaut (sauf client) — ce module ignore ce cas-là exprès (une
   ligne sans aucune case cochée dans tout son sous-arbre ne doit RIEN griser,
   le texte d'aide au-dessus du tableau explique déjà ce défaut, pas besoin
   de le répéter case par case). Seule une case COCHÉE quelque part dans le
   sous-arbre compte ici.

   Calculé côté client, à partir du DRAFT courant du tableau de droits (pas
   encore enregistré) — AUCUNE écriture n'en découle : une case grisée par ce
   calcul reste un pur affichage, jamais une restriction réellement
   enregistrée sur la ligne qui l'affiche. Voir CLAUDE.md, "État réel du
   code".
   =========================================================================== */

import type { TemplateFolderTreeNode } from '../hooks/useTemplateTree';
import type { FolderTreeNode } from '../hooks/useDatarooms';

export type AccessRole = 'admin' | 'membre' | 'client';

/** Miroir de ACCESS_ROLES côté Django (views.py) — jamais "superadmin", un
    bypass systématique, pas un rôle listable. */
export const ACCESS_ROLES: AccessRole[] = ['admin', 'membre', 'client'];

export interface RoleTreeNode {
  id: string;
  allowedRoles: string[];
  children?: RoleTreeNode[];
}

/** Vrai si CE nœud OU un descendant, à n'importe quelle profondeur, accorde
    explicitement `role` — ignore le défaut "ouvert si rien n'est coché". */
function subtreeGrants(role: AccessRole, node: RoleTreeNode): boolean {
  if (node.allowedRoles.includes(role)) return true;
  return (node.children ?? []).some(child => subtreeGrants(role, child));
}

/** Rôles effectivement accordés à ce nœud (directement, ou via un descendant). */
function effectiveRolesFor(node: RoleTreeNode): AccessRole[] {
  return ACCESS_ROLES.filter(role => subtreeGrants(role, node));
}

/** Aplati un arbre de `RoleTreeNode` en `Record<id, rôles effectifs>`. */
function computeEffectiveRolesByRowId(nodes: RoleTreeNode[]): Record<string, AccessRole[]> {
  const map: Record<string, AccessRole[]> = {};
  function walk(list: RoleTreeNode[]) {
    for (const node of list) {
      map[node.id] = effectiveRolesFor(node);
      walk(node.children ?? []);
    }
  }
  walk(nodes);
  return map;
}

/**
 * Rôles effectifs de chaque TemplateFolder, indexés par id de ligne du
 * tableau de droits (`"folder:<id>"`, même convention que `AccessRightsRow`)
 * — `allowedRolesFor` lit le brouillon courant, pas les données déjà
 * enregistrées sur `TemplateFolderTreeNode`.
 */
export function templateEffectiveRoles(
  tree: TemplateFolderTreeNode[],
  allowedRolesFor: (folderId: number) => string[],
): Record<string, string[]> {
  function toRoleTree(nodes: TemplateFolderTreeNode[]): RoleTreeNode[] {
    return nodes.map(node => ({
      id: `folder:${node.id}`,
      allowedRoles: allowedRolesFor(node.id),
      children: node.children.length ? toRoleTree(node.children) : undefined,
    }));
  }
  return computeEffectiveRolesByRowId(toRoleTree(tree));
}

/**
 * Rôles effectifs de la dataroom elle-même, de chaque dossier et de chaque
 * pièce, indexés par id de ligne (`"dataroom"`/`"folder:<id>"`/
 * `"document:<id>"`, même convention que `flattenDataroomAccessRows` dans
 * App.tsx). Les pièces sont des feuilles (jamais de `children`) — donner un
 * rôle à une pièce rend effectif ce rôle sur tous ses dossiers ancestraux,
 * jusqu'à la dataroom elle-même.
 */
export function dataroomEffectiveRoles(
  tree: FolderTreeNode[],
  rootDocuments: { id: number }[],
  documentsByFolderId: Record<number, { id: number }[]>,
  allowedRolesFor: (rowId: string) => string[],
): Record<string, string[]> {
  function folderNode(node: FolderTreeNode): RoleTreeNode {
    const children: RoleTreeNode[] = [
      ...(documentsByFolderId[node.id] ?? []).map(doc => ({
        id: `document:${doc.id}`,
        allowedRoles: allowedRolesFor(`document:${doc.id}`),
      })),
      ...node.children.map(folderNode),
    ];
    return {
      id: `folder:${node.id}`,
      allowedRoles: allowedRolesFor(`folder:${node.id}`),
      children: children.length ? children : undefined,
    };
  }

  const rootChildren: RoleTreeNode[] = [
    ...rootDocuments.map(doc => ({ id: `document:${doc.id}`, allowedRoles: allowedRolesFor(`document:${doc.id}`) })),
    ...tree.map(folderNode),
  ];
  const root: RoleTreeNode = {
    id: 'dataroom',
    allowedRoles: allowedRolesFor('dataroom'),
    children: rootChildren.length ? rootChildren : undefined,
  };
  return computeEffectiveRolesByRowId([root]);
}
