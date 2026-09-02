/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type DataroomSummary, type DocumentSummary } from '../api/endpoints';

export interface FolderTreeNode {
  id: number;
  name: string;
  /** Documents directement dans ce dossier (pas cumulé avec les sous-dossiers). */
  documentCount: number;
  children: FolderTreeNode[];
}

export interface DataroomTreeState {
  loading: boolean;
  error: string | null;
  /** Sous-dossiers de la racine — la racine elle-même n'est pas un nœud, voir rootDocuments. */
  tree: FolderTreeNode[];
  /** Documents à la racine de la dataroom (folder=None côté backend). */
  rootDocuments: DocumentSummary[];
  /** Documents de chaque dossier, indexés par id — un seul niveau par entrée (pas cumulatif). */
  documentsByFolderId: Record<number, DocumentSummary[]>;
}

export interface DataroomsState {
  loading: boolean;
  error: string | null;
  items: DataroomSummary[];
}

// Même principe que useSession : `load` n'écrit l'état qu'après le premier
// await, pour que l'effet de montage ne déclenche pas de rendu en cascade.
// L'état « en chargement » initial est porté par useState.

/**
 * Liste des datarooms de l'office courant — GET /api/datarooms/.
 *
 * `tagIds` filtre côté serveur en OU (au moins un des tags). Le tableau de
 * dépendances utilise sa forme sérialisée et non la référence : l'appelant
 * reconstruit sa sélection à chaque rendu, et dépendre du tableau lui-même
 * relancerait la requête en boucle.
 */
export function useDatarooms(enabled: boolean, tagIds: number[] = []) {
  const [state, setState] = useState<DataroomsState>({ loading: enabled, error: null, items: [] });
  const tagKey = tagIds.join(',');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const items = await api.listDatarooms(tagKey ? tagKey.split(',').map(Number) : [], signal);
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
    },
    [tagKey],
  );

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
    async (name: string, tagIdsForNew?: number[], templateId?: number | null) => {
      await api.createDataroom(name, tagIdsForNew, templateId);
      await refresh();
    },
    [refresh],
  );

  /** Pose la sélection de tags reçue sur un dossier, puis recharge la liste. */
  const setTags = useCallback(
    async (dataroomId: number, nextTagIds: number[]) => {
      await api.setDataroomTags(dataroomId, nextTagIds);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, create, setTags };
}

/**
 * Arborescence complète d'une dataroom (dossiers imbriqués + documents de
 * chaque niveau) — assemblée en parcourant récursivement
 * GET /api/datarooms/<id>/folders/?parent=<id>, un niveau à la fois, depuis la
 * racine.
 *
 * `Explorer` (organism du design system) attend un arbre déjà complet et n'a
 * aucun mécanisme de chargement différé par nœud — voir CLAUDE.md, "Front —
 * design system". La visibilité de chemin est déjà tranchée côté serveur À
 * CHAQUE niveau (un dossier n'apparaît que s'il est accessible ou mène à un
 * accès plus profond) : ce parcours ne montre donc jamais plus qu'un
 * utilisateur ne verrait de toute façon en cliquant de niveau en niveau.
 */
export function useDataroomTree(dataroomId: number | null) {
  const [state, setState] = useState<DataroomTreeState>({
    loading: dataroomId !== null,
    error: null,
    tree: [],
    rootDocuments: [],
    documentsByFolderId: {},
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (dataroomId === null) return;
      const documentsByFolderId: Record<number, DocumentSummary[]> = {};

      async function walk(parentId?: number): Promise<{ nodes: FolderTreeNode[]; documents: DocumentSummary[] }> {
        const level = await api.listFolderLevel(dataroomId as number, parentId, signal);
        const nodes = await Promise.all(
          level.folders.map(async folder => {
            const sub = await walk(folder.id);
            documentsByFolderId[folder.id] = sub.documents;
            return { id: folder.id, name: folder.name, documentCount: sub.documents.length, children: sub.nodes };
          }),
        );
        return { nodes, documents: level.documents };
      }

      try {
        const root = await walk(undefined);
        if (signal?.aborted) return;
        setState({
          loading: false, error: null, tree: root.nodes, rootDocuments: root.documents, documentsByFolderId,
        });
      } catch (err) {
        if (signal?.aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Chargement impossible',
          tree: [],
          rootDocuments: [],
          documentsByFolderId: {},
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

  /** `parentId` omis = dossier créé à la racine de la dataroom. */
  const createFolder = useCallback(
    async (name: string, parentId?: number) => {
      if (dataroomId === null) return;
      await api.createFolder(dataroomId, name, parentId);
      await refresh();
    },
    [dataroomId, refresh],
  );

  /** `parentId` omis = document déposé à la racine de la dataroom. */
  const upload = useCallback(
    async (file: File, parentId?: number) => {
      if (dataroomId === null) return;
      await api.uploadDocument(dataroomId, file, parentId);
      await refresh();
    },
    [dataroomId, refresh],
  );

  return { ...state, refresh, createFolder, upload };
}
