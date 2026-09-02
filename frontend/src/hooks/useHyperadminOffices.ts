/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type HyperadminOffice } from '../api/endpoints';

export interface HyperadminOfficesState {
  loading: boolean;
  error: string | null;
  items: HyperadminOffice[];
}

/**
 * Tous les offices de la plateforme — GET /api/hyperadmin/offices/.
 *
 * `enabled` doit valoir `whoami.is_hyperadmin` : le serveur refuse déjà par un
 * 403, mais appeler quand même reviendrait à provoquer une erreur à chaque
 * connexion d'un utilisateur ordinaire pour apprendre ce que `whoami` a déjà
 * dit. La console est transverse aux offices — la liste renvoyée ne dépend pas
 * du sous-domaine depuis lequel elle est demandée.
 */
export function useHyperadminOffices(enabled: boolean) {
  const [state, setState] = useState<HyperadminOfficesState>({
    loading: enabled,
    error: null,
    items: [],
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await api.listHyperadminOffices(signal);
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

  /**
   * Crée l'office ET son premier administrateur en un appel. Long à l'échelle
   * d'un clic : le serveur provisionne et migre une base SQLite dédiée. L'appel
   * n'est pas avalé ici — l'écran attend la promesse pour tenir son bouton
   * occupé et afficher le message du serveur en cas de refus.
   */
  const createOffice = useCallback(
    async (payload: {
      subdomain: string;
      name: string;
      adminMode: 'create' | 'attach';
      adminUsername: string;
      adminPassword?: string;
    }) => {
      const created = await api.createHyperadminOffice(payload);
      await refresh();
      return created;
    },
    [refresh],
  );

  /**
   * Un office désactivé devient inaccessible comme un sous-domaine inconnu
   * (TenantResolutionMiddleware côté Django) : ses données restent en place,
   * mais plus personne n'y entre — y compris ses propres membres.
   */
  const setOfficeActive = useCallback(
    async (officeId: number, isActive: boolean) => {
      await api.updateHyperadminOffice(officeId, { is_active: isActive });
      await refresh();
    },
    [refresh],
  );

  /**
   * Remplace l'ensemble des modules activés (pas d'ajout unitaire côté API).
   *
   * Renvoie l'office tel que le serveur l'a enregistré — pas ce qui a été
   * demandé : les slugs qu'il ne connaît pas sont ignorés EN SILENCE (défense en
   * profondeur côté Django). Sans cette valeur de retour, l'appelant ne pourrait
   * pas distinguer un module refusé d'un module activé.
   */
  const setOfficeModules = useCallback(
    async (officeId: number, slugs: string[]) => {
      const updated = await api.updateHyperadminOffice(officeId, { enabled_module_slugs: slugs });
      await refresh();
      return updated;
    },
    [refresh],
  );

  return { ...state, refresh, createOffice, setOfficeActive, setOfficeModules };
}
