/* Même préambule que useDatarooms : `load` n'écrit l'état qu'APRÈS le premier
   await, la règle react/set-state-in-effect ne sait pas le distinguer d'un
   setState synchrone. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type TagColor, type TagSummary } from '../api/endpoints';

export interface TagsState {
  loading: boolean;
  error: string | null;
  items: TagSummary[];
}

/**
 * Catalogue de tags de l'office — GET /api/tags/.
 *
 * Le catalogue est chargé UNE fois pour l'écran et rechargé après chaque
 * création/renommage/suppression : c'est la même liste qui alimente le menu de
 * filtre de la liste des dossiers et les sélecteurs posés sur un dossier ou une
 * pièce, et deux copies désynchronisées donneraient un tag visible ici mais
 * introuvable là.
 *
 * `create` renvoie le tag (existant ou nouveau) pour que l'appelant puisse
 * l'ajouter immédiatement à la sélection en cours sans attendre le rechargement
 * — c'est tout l'intérêt de la création à la volée.
 */
export function useTags(enabled: boolean) {
  const [state, setState] = useState<TagsState>({ loading: enabled, error: null, items: [] });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listTags(signal);
      if (signal?.aborted) return;
      setState({ loading: false, error: null, items });
    } catch (err) {
      if (signal?.aborted) return;
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Chargement des tags impossible',
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
    async (name: string, color?: TagColor): Promise<TagSummary> => {
      const tag = await api.createTag(name, color);
      await refresh();
      return tag;
    },
    [refresh],
  );

  const update = useCallback(
    async (tagId: number, patch: { name?: string; color?: TagColor }) => {
      await api.updateTag(tagId, patch);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (tagId: number) => {
      await api.deleteTag(tagId);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, create, update, remove };
}
