/* ===========================================================================
   Catalogue des rôles d'un membership d'office.

   Miroir exact de `OfficeMembership.ROLE_RANK` côté Django
   (backend/datarooms/models.py) : les mêmes quatre rôles, les mêmes rangs. Le
   backend refuse déjà toute attribution au-dessus du rang de l'appelant
   (`_validate_role_for_caller`) — `assignableRoles` sert à ne pas PROPOSER dans
   l'interface un rôle qui sera refusé, pas à protéger quoi que ce soit : la
   décision reste au serveur.

   Volontairement placé hors de tout composant (comme navModel.ts) : la page
   Annuaire et les deux modales s'en servent, aucune ne doit importer l'autre.
   =========================================================================== */

/** Du plus fort au plus faible — l'ordre d'affichage dans les listes déroulantes. */
export const OFFICE_ROLES = ['superadmin', 'admin', 'membre', 'client'] as const;

export type OfficeRole = (typeof OFFICE_ROLES)[number];

/** Rangs du backend. Un rôle inconnu vaut -1 : il n'ouvre rien. */
export const ROLE_RANK: Record<string, number> = {
  superadmin: 3,
  admin: 2,
  membre: 1,
  client: 0,
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrateur',
  membre: 'Membre',
  client: 'Client',
};

/** Libellé lisible d'un rôle ; un rôle inconnu est rendu tel quel plutôt que masqué. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * Rôles qu'un appelant de ce rôle peut attribuer — jamais au-dessus de son
 * propre rang, exactement comme `_roles_at_or_below` côté serveur. Un appelant
 * qui n'est ni admin ni superadmin n'obtient rien : la liste vide, et l'écran
 * n'affiche alors aucun contrôle d'écriture.
 */
export function assignableRoles(callerRole: string | undefined): string[] {
  if (callerRole !== 'admin' && callerRole !== 'superadmin') return [];
  const rank = ROLE_RANK[callerRole];
  return OFFICE_ROLES.filter(role => ROLE_RANK[role] <= rank);
}
