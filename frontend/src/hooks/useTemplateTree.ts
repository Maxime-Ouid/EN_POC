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
  allowed_roles: string[];
  user_ids: number[];
  group_ids: number[];
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
            allowed_roles: folder.allowed_roles,
            user_ids: folder.user_ids,
            group_ids: folder.group_ids,
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
    // `templateId` passe de null à un id (ou d'un id à un autre) sur un
    // re-rendu de l'appelant, pas un remontage du hook : sans ce reset,
    // `loading` restait à sa valeur précédente (souvent déjà `false`) tout le
    // temps de la marche récursive — un modèle à plusieurs dizaines de
    // dossiers (chaque niveau étant un aller-retour réseau séparé) affichait
    // alors « aucun dossier » de façon trompeuse le temps du chargement,
    // avant de se corriger seul une fois la marche terminée. Repéré en
    // vérifiant en Chrome réel le modèle « Vente immobilière — standard »
    // (14 rubriques, 64 requêtes), invisible sur un petit modèle de test.
    if (templateId === null) {
      setState({ loading: false, error: null, tree: [] });
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [templateId, load]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
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

  /** Remplace l'ensemble des droits (rôles ET utilisateurs nommés) d'un dossier
      — PATCH idempotent, pas d'ajout unitaire. Utilisé par AccessRightsTable
      (via App.tsx), un aller-retour par ligne modifiée à l'enregistrement. */
  const setFolderAccess = useCallback(
    async (folderId: number, allowedRoles: string[], userIds: number[]) => {
      if (templateId === null) return;
      await api.updateTemplateFolder(templateId, folderId, {
        allowed_roles: allowedRoles, user_ids: userIds,
      });
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

  return { ...state, refresh, createFolder, renameFolder, setFolderAccess, removeFolder };
}
