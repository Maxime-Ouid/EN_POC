/* Ce hook charge des données au montage : `load` n'écrit l'état qu'APRÈS le
   premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type AccessRestrictionSummary } from '../api/endpoints';

export type AccessTargetKind = 'dataroom' | 'folder' | 'document';

export interface AccessRestrictionsListState {
  loading: boolean;
  error: string | null;
  items: AccessRestrictionSummary[];
}

/**
 * Toutes les restrictions actives de l'office courant, libellé résolu —
 * GET /api/access-restrictions/. Réservé admin/superadmin. Consommée par
 * l'onglet "Droits d'accès" d'une dataroom (préremplissage du tableau, voir
 * `AccessRightsTable`/`useAccessRightsDraft`) ET par la modale "Restrictions"
 * de la page Utilisateurs (voir CLAUDE.md, "État réel du code", 02/09/2026).
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
