/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type TemplateSummary } from '../api/endpoints';

export interface TemplatesState {
  loading: boolean;
  error: string | null;
  items: TemplateSummary[];
}

/**
 * Modèles de dataroom de l'office courant — GET /api/templates/. Réservé aux
 * rôles admin/superadmin (403 sinon côté backend, même gate que
 * office-users). Deux appelants : la modale « Nouveau dossier » (liste seule,
 * pour choisir un modèle à la création) et l'écran de gestion des modèles
 * (liste + CRUD) — voir App.tsx.
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

  const create = useCallback(
    async (name: string, description?: string) => {
      await api.createTemplate(name, description);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (templateId: number, patch: { name?: string; description?: string }) => {
      await api.updateTemplate(templateId, patch);
      await refresh();
    },
    [refresh],
  );

  /** Supprime le modèle ET son arborescence — sans effet sur les datarooms déjà créées à partir de lui. */
  const remove = useCallback(
    async (templateId: number) => {
      await api.deleteTemplate(templateId);
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, create, update, remove };
}
