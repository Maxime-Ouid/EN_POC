/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type OfficeMembership, type TenantConfig, type WhoAmI } from '../api/endpoints';
import { ApiError } from '../api/client';

export interface SessionState {
  status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  user: WhoAmI | null;
  offices: OfficeMembership[];
  tenant: TenantConfig | null;
  error: string | null;
}

const INITIAL: SessionState = {
  status: 'loading',
  user: null,
  offices: [],
  tenant: null,
  error: null,
};

/**
 * Session courante : utilisateur connecté, offices auxquels il appartient et
 * configuration de l'office résolu par le sous-domaine.
 *
 * Un 401/403 sur /api/whoami/ n'est pas une erreur : c'est simplement un
 * visiteur non connecté, d'où le statut `anonymous` distinct de `error`.
 */
export function useSession() {
  const [state, setState] = useState<SessionState>(INITIAL);

  // `load` n'écrit l'état qu'après le premier await : l'effet de montage
  // n'enchaîne donc pas un rendu supplémentaire, et l'état « loading » initial
  // vient de useState, pas d'un setState dans l'effet.
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const user = await api.whoami(signal);
      // Les deux appels suivants dépendent de l'authentification, jamais l'un
      // de l'autre : on les lance ensemble.
      const [offices, tenant] = await Promise.all([
        api.myOffices(signal).catch(() => [] as OfficeMembership[]),
        api.tenantConfig(signal).catch(() => null),
      ]);
      if (signal?.aborted) return;
      setState({ status: 'authenticated', user, offices, tenant, error: null });
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setState({ ...INITIAL, status: 'anonymous' });
        return;
      }
      setState({
        ...INITIAL,
        status: 'error',
        error: err instanceof Error ? err.message : 'Backend injoignable',
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Rechargement déclenché par une action (connexion, changement d'office). */
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));
    await load();
  }, [load]);

  const login = useCallback(
    async (username: string, password: string) => {
      await api.login(username, password);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, login };
}
