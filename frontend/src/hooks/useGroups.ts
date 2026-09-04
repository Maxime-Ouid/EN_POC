/* Même préambule que useTags : `load` n'écrit l'état qu'APRÈS le premier
   await, la règle react/set-state-in-effect ne sait pas le distinguer d'un
   setState synchrone. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type GroupCategory, type GroupSummary } from '../api/endpoints';

export interface GroupsState {
  loading: boolean;
  error: string | null;
  items: GroupSummary[];
}

/**
 * Catalogue de groupes de droits de l'office — GET /api/groups/.
 *
 * Même patron que useTags : chargé une fois pour l'écran et rechargé après
 * chaque création/modification/suppression. Contrairement à un tag, `create`
 * peut échouer (nom déjà pris — 409, groupe étant un objet de droits, pas de
 * fusion silencieuse) : l'appelant doit intercepter le rejet.
 */
export function useGroups(enabled: boolean) {
  const [state, setState] = useState<GroupsState>({ loading: enabled, error: null, items: [] });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listGroups(signal);
      if (signal?.aborted) return;
      setState({ loading: false, error: null, items });
    } catch (err) {
      if (signal?.aborted) return;
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Chargement des groupes impossible',
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const create = useCallback(
    async (
      name: string, category: GroupCategory, userIds?: number[], pageKeys?: string[],
    ): Promise<GroupSummary> => {
      const group = await api.createGroup(name, category, userIds, pageKeys);
      await refresh();
      return group;
    },
    [refresh],
  );

  const update = useCallback(
    async (
      groupId: number,
      patch: { name?: string; category?: GroupCategory; user_ids?: number[]; page_keys?: string[] },
    ) => {
      await api.updateGroup(groupId, patch);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (groupId: number) => {
      await api.deleteGroup(groupId);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, create, update, remove };
}
