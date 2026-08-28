/* Même principe que useSession/useDatarooms : `load` n'écrit l'état qu'APRÈS le
   premier await, la règle react/set-state-in-effect ne sait pas les distinguer. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';

/**
 * Ce que le serveur répond pour un module, traduit en quelque chose d'affichable.
 *
 * `no-screen` mérite une explication : le module est bien activé pour l'office
 * (il apparaît dans /api/tenant-config/) mais aucune route Django ne le sert
 * encore. C'est un état normal du POC, pas une panne — et le dire à l'écran vaut
 * mieux que d'afficher « erreur 404 » à un notaire.
 */
export type ModuleStatus = 'loading' | 'ready' | 'disabled' | 'no-screen' | 'error';

export interface ModuleState {
  status: ModuleStatus;
  message: string | null;
  error: string | null;
}

/** Contenu d'un module — GET /api/modules/<slug>/. `null` = aucun module ouvert. */
export function useModule(slug: string | null) {
  const [state, setState] = useState<ModuleState>({
    status: slug ? 'loading' : 'ready',
    message: null,
    error: null,
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      try {
        const { message } = await api.moduleContent(slug, signal);
        if (signal?.aborted) return;
        setState({ status: 'ready', message, error: null });
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof ApiError && err.status === 403) {
          setState({ status: 'disabled', message: null, error: err.message });
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: 'no-screen', message: null, error: null });
          return;
        }
        setState({
          status: 'error',
          message: null,
          error: err instanceof Error ? err.message : 'Chargement impossible',
        });
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!slug) return;
    // Repartir de « chargement » à chaque changement de module : sans cela, le
    // contenu du module précédent reste affiché sous le nouveau titre.
    setState({ status: 'loading', message: null, error: null });
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [slug, load]);

  const refresh = useCallback(async () => {
    setState({ status: 'loading', message: null, error: null });
    await load();
  }, [load]);

  return { ...state, refresh };
}
