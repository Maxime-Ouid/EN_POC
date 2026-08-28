/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type OfficeUserRow } from '../api/endpoints';

export interface OfficeUsersState {
  loading: boolean;
  error: string | null;
  items: OfficeUserRow[];
}

/**
 * Utilisateurs de l'office courant — GET /api/office-users/. Réservé aux rôles
 * admin/superadmin (403 sinon côté backend, voir _manager_role) ; un admin ne
 * voit jamais les memberships superadmin de son office (OfficeMembership.
 * ROLE_RANK), un superadmin voit tout le monde. Pas encore consommé par un
 * écran dans ce chantier — voir CLAUDE.md.
 */
export function useOfficeUsers(enabled: boolean) {
  const [state, setState] = useState<OfficeUsersState>({ loading: enabled, error: null, items: [] });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listOfficeUsers(signal);
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

  /** Crée un NOUVEAU compte (pas un rattachement) + son OfficeMembership. */
  const createUser = useCallback(
    async (username: string, password: string, role: string) => {
      await api.createOfficeUser(username, password, role);
      await refresh();
    },
    [refresh],
  );

  /** Rattache un utilisateur EXISTANT (recherche par nom exact, pas d'annuaire). */
  const attachUser = useCallback(
    async (username: string, role: string) => {
      await api.attachOfficeUser(username, role);
      await refresh();
    },
    [refresh],
  );

  const updateRole = useCallback(
    async (membershipId: number, role: string) => {
      await api.updateOfficeUserRole(membershipId, role);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, createUser, attachUser, updateRole };
}
