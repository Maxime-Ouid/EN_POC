/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type TemplateFolderSummary, type TemplateSummary } from '../api/endpoints';

export interface TemplatesState {
  loading: boolean;
  error: string | null;
  items: TemplateSummary[];
}

/**
 * Catalogue des modèles de dossier de l'office — GET /api/templates/.
 *
 * Réservé admin/superadmin côté serveur (403 sinon) : `enabled` sert à ne pas
 * appeler du tout pour un membre ordinaire, plutôt qu'à masquer une erreur
 * après coup. La liste alimente DEUX écrans — la gestion dans Personnalisation
 * et le choix « Partir d'un modèle » de la modale « Nouveau dossier » — d'où sa
 * place ici et non dans l'un des deux.
 */
export function useTemplates(enabled: boolean) {
  const [state, setState] = useState<TemplatesState>({ loading: enabled, error: null, items: [] });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listTemplates(signal);
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

  const createTemplate = useCallback(
    async (name: string, description: string) => {
      const created = await api.createTemplate(name, description);
      await refresh();
      return created;
    },
    [refresh],
  );

  const renameTemplate = useCallback(
    async (templateId: number, patch: { name?: string; description?: string }) => {
      await api.updateTemplate(templateId, patch);
      await refresh();
    },
    [refresh],
  );

  const deleteTemplate = useCallback(
    async (templateId: number) => {
      await api.deleteTemplate(templateId);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, createTemplate, renameTemplate, deleteTemplate };
}

/** Un dossier de modèle, avec ses enfants déjà rattachés. */
export interface TemplateFolderNode extends TemplateFolderSummary {
  children: TemplateFolderNode[];
}

export interface TemplateTreeState {
  loading: boolean;
  error: string | null;
  tree: TemplateFolderNode[];
}

/**
 * Arborescence complète d'un modèle — parcours récursif de
 * `GET /api/templates/<id>/folders/?parent=`, même méthode que
 * `useDataroomTree` (l'API sert un NIVEAU à la fois, pas un arbre).
 *
 * L'arbre est reconstruit en entier après chaque écriture : à l'échelle d'un
 * modèle (quelques dizaines de dossiers au plus, saisis à la main), recharger
 * coûte moins cher qu'entretenir une copie locale qui peut diverger de ce que
 * le serveur a réellement enregistré.
 *
 * `templateId` à `null` = aucun modèle ouvert : le hook ne charge rien et rend
 * un arbre vide, ce qui laisse l'éditeur monté sans requête inutile.
 */
export function useTemplateTree(templateId: number | null) {
  const [state, setState] = useState<TemplateTreeState>({
    loading: templateId !== null,
    error: null,
    tree: [],
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (templateId === null) {
        setState({ loading: false, error: null, tree: [] });
        return;
      }

      async function walk(parentId?: number): Promise<TemplateFolderNode[]> {
        const level = await api.listTemplateFolders(templateId as number, parentId, signal);
        return Promise.all(
          level.folders.map(async folder => ({ ...folder, children: await walk(folder.id) })),
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

  const addFolder = useCallback(
    async (name: string, parentId: number | null, visibleToRoles: string[]) => {
      if (templateId === null) return;
      await api.createTemplateFolder(templateId, name, parentId, visibleToRoles);
      await refresh();
    },
    [templateId, refresh],
  );

  const updateFolder = useCallback(
    async (folderId: number, patch: { name?: string; visible_to_roles?: string[] }) => {
      if (templateId === null) return;
      await api.updateTemplateFolder(templateId, folderId, patch);
      await refresh();
    },
    [templateId, refresh],
  );

  /** Supprime le dossier ET sa descendance — la cascade est côté Django. */
  const removeFolder = useCallback(
    async (folderId: number) => {
      if (templateId === null) return;
      await api.deleteTemplateFolder(templateId, folderId);
      await refresh();
    },
    [templateId, refresh],
  );

  return { ...state, refresh, addFolder, updateFolder, removeFolder };
}
