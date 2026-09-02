/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/endpoints';

export interface TemplateFolderTreeNode {
  id: number;
  name: string;
  visible_to_roles: string[];
  children: TemplateFolderTreeNode[];
}

export interface TemplateTreeState {
  loading: boolean;
  error: string | null;
  /** Dossiers de premier niveau du modèle — pas de nœud racine synthétique,
      contrairement à useDataroomTree : un Template n'a pas de documents à la
      racine à porter, donc rien à y accrocher. */
  tree: TemplateFolderTreeNode[];
}

/**
 * Arborescence complète d'un Template (TemplateFolder imbriqués, sans
 * documents) — assemblée en parcourant récursivement
 * GET /api/templates/<id>/folders/?parent=<id>, même patron que
 * useDataroomTree (Explorer attend un arbre déjà complet, aucun chargement
 * différé par nœud).
 */
export function useTemplateTree(templateId: number | null) {
  const [state, setState] = useState<TemplateTreeState>({
    loading: templateId !== null,
    error: null,
    tree: [],
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (templateId === null) return;

      async function walk(parentId?: number): Promise<TemplateFolderTreeNode[]> {
        const level = await api.listTemplateFolderLevel(templateId as number, parentId, signal);
        return Promise.all(
          level.folders.map(async folder => ({
            id: folder.id,
            name: folder.name,
            visible_to_roles: folder.visible_to_roles,
            children: await walk(folder.id),
          })),
        );
      }

      try {
        const tree = await walk(undefined);
        if (signal?.aborted) return;
        setState({ loading: false, error: null, tree });
      } catch (err) {
        if (signal?.aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Chargement impossible',
          tree: [],
        });
      }
    },
    [templateId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  /** `parentId` omis = dossier créé à la racine du modèle. */
  const createFolder = useCallback(
    async (name: string, parentId?: number) => {
      if (templateId === null) return;
      await api.createTemplateFolder(templateId, name, parentId);
      await refresh();
    },
    [templateId, refresh],
  );

  const renameFolder = useCallback(
    async (folderId: number, name: string) => {
      if (templateId === null) return;
      await api.updateTemplateFolder(templateId, folderId, { name });
      await refresh();
    },
    [templateId, refresh],
  );

  /** Remplace l'ensemble des rôles visibles (PATCH idempotent, pas d'ajout unitaire). */
  const setFolderRoles = useCallback(
    async (folderId: number, roles: string[]) => {
      if (templateId === null) return;
      await api.updateTemplateFolder(templateId, folderId, { visible_to_roles: roles });
      await refresh();
    },
    [templateId, refresh],
  );

  /** Supprime le dossier ET ses sous-dossiers (cascade, self-FK côté serveur). */
  const removeFolder = useCallback(
    async (folderId: number) => {
      if (templateId === null) return;
      await api.deleteTemplateFolder(templateId, folderId);
      await refresh();
    },
    [templateId, refresh],
  );

  return { ...state, refresh, createFolder, renameFolder, setFolderRoles, removeFolder };
}
