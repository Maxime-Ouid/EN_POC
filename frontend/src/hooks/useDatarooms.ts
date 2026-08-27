/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type DataroomSummary, type DocumentSummary } from '../api/endpoints';

export interface DataroomsState {
  loading: boolean;
  error: string | null;
  items: DataroomSummary[];
}

// Même principe que useSession : `load` n'écrit l'état qu'après le premier
// await, pour que l'effet de montage ne déclenche pas de rendu en cascade.
// L'état « en chargement » initial est porté par useState.

/** Liste des datarooms de l'office courant — GET /api/datarooms/. */
export function useDatarooms(enabled: boolean) {
  const [state, setState] = useState<DataroomsState>({ loading: enabled, error: null, items: [] });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listDatarooms(signal);
      if (signal?.aborted) return;
      setState({ loading: false, error: null, items });
    } catch (err) {
      if (signal?.aborted) return;
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Chargement impossible',
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
    setState(prev => ({ ...prev, loading: true, error: null }));
    await load();
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      await api.createDataroom(name);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, create };
}

interface DocumentsFetch {
  error: string | null;
  items: DocumentSummary[];
  /** Dataroom à laquelle appartient `items` — sert à ignorer un résultat périmé. */
  forId: number | null;
}

export interface DocumentsState {
  loading: boolean;
  error: string | null;
  items: DocumentSummary[];
}

/**
 * Documents d'une dataroom — GET /api/datarooms/<id>/documents/.
 *
 * Le résultat mémorise la dataroom d'origine (`forId`) : quand on change de
 * dossier, les pièces du précédent ne sont jamais affichées sous le nouveau
 * titre le temps de la requête — l'état dérive de la comparaison, sans effet
 * de remise à zéro.
 */
export function useDocuments(dataroomId: number | null) {
  const [fetched, setFetched] = useState<DocumentsFetch>({
    error: null,
    items: [],
    forId: null,
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (dataroomId === null) return;
      try {
        const items = await api.listDocuments(dataroomId, signal);
        if (signal?.aborted) return;
        setFetched({ error: null, items, forId: dataroomId });
      } catch (err) {
        if (signal?.aborted) return;
        setFetched({
          error: err instanceof Error ? err.message : 'Chargement impossible',
          items: [],
          forId: dataroomId,
        });
      }
    },
    [dataroomId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      if (dataroomId === null) return;
      await api.uploadDocument(dataroomId, file);
      await refresh();
    },
    [dataroomId, refresh],
  );

  const isCurrent = fetched.forId === dataroomId;
  const state: DocumentsState = {
    loading: dataroomId !== null && !isCurrent,
    error: isCurrent ? fetched.error : null,
    items: isCurrent ? fetched.items : [],
  };

  return { ...state, refresh, upload };
}
