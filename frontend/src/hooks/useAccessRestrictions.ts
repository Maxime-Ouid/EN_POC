/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type AccessRestrictionSummary } from '../api/endpoints';

export type AccessTargetKind = 'dataroom' | 'folder' | 'document';

function getAccess(dataroomId: number, kind: AccessTargetKind, targetId: number | null, signal?: AbortSignal) {
  if (kind === 'dataroom') return api.getDataroomAccess(dataroomId, signal);
  if (kind === 'folder') return api.getFolderAccess(dataroomId, targetId as number, signal);
  return api.getDocumentAccess(dataroomId, targetId as number, signal);
}

function setAccess(dataroomId: number, kind: AccessTargetKind, targetId: number | null, userIds: number[]) {
  if (kind === 'dataroom') return api.setDataroomAccess(dataroomId, userIds);
  if (kind === 'folder') return api.setFolderAccess(dataroomId, targetId as number, userIds);
  return api.setDocumentAccess(dataroomId, targetId as number, userIds);
}

interface AccessFetch {
  error: string | null;
  userIds: number[];
  /** Clé (dataroomId, kind, targetId) d'origine — sert à ignorer un résultat périmé. */
  forKey: string | null;
}

export interface AccessRestrictionState {
  loading: boolean;
  error: string | null;
  userIds: number[];
}

/**
 * Restriction d'accès d'un objet précis (dataroom, dossier ou document) — GET/POST
 * des endpoints `.../access/` (voir api/endpoints.ts). `targetId` est ignoré pour
 * kind='dataroom' (la dataroom elle-même n'a pas d'id de cible séparé).
 *
 * Réservé en écriture aux rôles admin/superadmin de l'office (403 sinon) — même
 * gate que la gestion des utilisateurs. Liste vide envoyée à `save` supprime la
 * restriction plutôt que de la laisser vide (accès ouvert par défaut, voir
 * CLAUDE.md, "État réel du code").
 */
export function useAccessRestriction(dataroomId: number | null, kind: AccessTargetKind, targetId: number | null) {
  const key =
    dataroomId !== null && (kind === 'dataroom' || targetId !== null)
      ? `${dataroomId}:${kind}:${targetId ?? ''}`
      : null;

  const [fetched, setFetched] = useState<AccessFetch>({ error: null, userIds: [], forKey: null });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (key === null || dataroomId === null) return;
      try {
        const result = await getAccess(dataroomId, kind, targetId, signal);
        if (signal?.aborted) return;
        setFetched({ error: null, userIds: result.user_ids, forKey: key });
      } catch (err) {
        if (signal?.aborted) return;
        setFetched({ error: err instanceof Error ? err.message : 'Chargement impossible', userIds: [], forKey: key });
      }
    },
    [dataroomId, kind, targetId, key],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const save = useCallback(
    async (userIds: number[]) => {
      if (key === null || dataroomId === null) return;
      const result = await setAccess(dataroomId, kind, targetId, userIds);
      setFetched({ error: null, userIds: result.user_ids, forKey: key });
    },
    [dataroomId, kind, targetId, key],
  );

  const isCurrent = fetched.forKey === key;
  const state: AccessRestrictionState = {
    loading: key !== null && !isCurrent,
    error: isCurrent ? fetched.error : null,
    userIds: isCurrent ? fetched.userIds : [],
  };

  return { ...state, save };
}

export interface AccessRestrictionsListState {
  loading: boolean;
  error: string | null;
  items: AccessRestrictionSummary[];
}

/**
 * Toutes les restrictions actives de l'office courant, libellé résolu —
 * GET /api/access-restrictions/. Réservé admin/superadmin. Consommé par la vue
 * "par utilisateur" (pas encore construite dans ce chantier — voir CLAUDE.md).
 */
export function useAccessRestrictionsList(enabled: boolean) {
  const [state, setState] = useState<AccessRestrictionsListState>({
    loading: enabled, error: null, items: [],
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listAccessRestrictions(signal);
      if (signal?.aborted) return;
      setState({ loading: false, error: null, items });
    } catch (err) {
      if (signal?.aborted) return;
      setState({ loading: false, error: err instanceof Error ? err.message : 'Chargement impossible', items: [] });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    await load();
  }, [load]);

  return { ...state, refresh };
}
