/* ===========================================================================
   Port TypeScript pur de _user_can_access / _subtree_has_accessible_content /
   _level_visible (backend/datarooms/views.py) — restreint au cas qui a un sens
   dans l'éditeur de template : trois rôles listables, pas de user_ids (une
   case "utilisateur nommé" répond à "CET individu verra-t-il", pas "un membre
   quelconque de rôle X verra-t-il" — seul allowed_roles alimente ce calcul),
   pas de documents (un Template n'en porte pas).

   Calculé côté client, à partir du DRAFT courant du tableau de droits (pas
   encore enregistré) — c'est ce qui permet à l'éditeur de refléter en direct
   la même visibilité de chemin qu'une vraie dataroom, avant tout
   enregistrement. Voir CLAUDE.md, "État réel du code", 02/09/2026.
   =========================================================================== */

export type AccessRole = 'admin' | 'membre' | 'client';

/** Miroir de ACCESS_ROLES côté Django (views.py) — jamais "superadmin", un
    bypass systématique, pas un rôle listable. */
export const ACCESS_ROLES: AccessRole[] = ['admin', 'membre', 'client'];

export interface VisibilityNode {
  id: string;
  allowedRoles: string[];
  children?: VisibilityNode[];
}

/** Miroir de _user_can_access, sans le bypass superadmin (hors de portée ici
    — superadmin est toujours ouvert, une pastille le confirmant n'apporterait
    rien) ni user_ids. */
function directAccess(role: AccessRole, allowedRoles: string[]): boolean {
  if (!allowedRoles.length) return role !== 'client';
  return allowedRoles.includes(role);
}

/** Miroir de _level_visible : direct, OU un sous-dossier y mène. */
function levelVisible(role: AccessRole, node: VisibilityNode): boolean {
  return directAccess(role, node.allowedRoles) || (node.children ?? []).some(c => levelVisible(role, c));
}

/** Rôles pour lesquels ce nœud serait visible une fois le modèle appliqué. */
export function visibleRolesFor(node: VisibilityNode): AccessRole[] {
  return ACCESS_ROLES.filter(role => levelVisible(role, node));
}
