import { useCallback, useEffect, useState } from 'react';

export interface AccessRightsEntry {
  allowedRoles: string[];
  userIds: number[];
}

const EMPTY_ENTRY: AccessRightsEntry = { allowedRoles: [], userIds: [] };

function sameEntry(a: AccessRightsEntry, b: AccessRightsEntry): boolean {
  return (
    a.allowedRoles.length === b.allowedRoles.length &&
    a.allowedRoles.every(r => b.allowedRoles.includes(r)) &&
    a.userIds.length === b.userIds.length &&
    a.userIds.every(id => b.userIds.includes(id))
  );
}

/**
 * État local (brouillon) d'un tableau de droits d'accès — `AccessRightsTable`,
 * réutilisé identiquement pour une vraie dataroom (onglet "Droits d'accès") et
 * pour un Template (mode "Droits d'accès") : les deux éditent une collection
 * de lignes {allowedRoles, userIds} avec un seul aller-retour réseau par ligne
 * modifiée à l'enregistrement explicite, jamais un par case cochée (voir
 * CLAUDE.md, "État réel du code", 02/09/2026).
 *
 * `original` doit être une référence STABLE tant que les données serveur
 * sous-jacentes n'ont pas changé (`useMemo` côté appelant, keyed sur les
 * données réellement chargées) — sinon chaque rendu de l'appelant réinitialise
 * le brouillon en cours d'édition avant même que l'utilisateur ait pu cocher
 * une case.
 */
export function useAccessRightsDraft(original: Record<string, AccessRightsEntry>) {
  const [draft, setDraft] = useState(original);

  useEffect(() => {
    setDraft(original);
  }, [original]);

  const setRow = useCallback((rowId: string, next: AccessRightsEntry) => {
    setDraft(prev => ({ ...prev, [rowId]: next }));
  }, []);

  const reset = useCallback(() => setDraft(original), [original]);

  const dirtyRowIds = Object.keys(draft).filter(
    id => !sameEntry(original[id] ?? EMPTY_ENTRY, draft[id] ?? EMPTY_ENTRY),
  );

  return { draft, setRow, dirtyRowIds, reset };
}
