/* Ces hooks chargent des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). La règle react/set-state-in-effect ne
   distingue pas un setState synchrone d'un setState post-await et signalerait
   tout chargement de données ; elle est neutralisée ici, et uniquement ici. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type HyperadminOfficeRow, type ModuleSummary, type SuperadminAccount } from '../api/endpoints';

export interface HyperadminOfficesState {
  loading: boolean;
  error: string | null;
  offices: HyperadminOfficeRow[];
  /** Catalogue complet — voir ModuleSummary. Chargé avec les offices, pas séparément. */
  modules: ModuleSummary[];
  /** Comptes déjà superadmin quelque part — voir SuperadminAccount. Sert le
      sélecteur "compte existant" de NewOfficeModal quand le rôle choisi est
      superadmin, chargé ici pour rester disponible dès l'ouverture de la
      modale plutôt que de partir en fetch séparé à chaque changement de rôle. */
  superadmins: SuperadminAccount[];
}

/**
 * Offices vus par l'interface hyperadmin — GET /api/hyperadmin/offices/ +
 * GET /api/hyperadmin/modules/ + GET /api/hyperadmin/superadmins/, chargés
 * ensemble (aucun des trois ne dépend d'un autre). Réservé au rôle transverse
 * HyperadminAccess (403 sinon côté backend) — voir hyperadmin/HyperadminApp.tsx,
 * seul appelant.
 *
 * `enabled` (même patron que useOfficeUsers) : HyperadminApp appelle ce hook
 * AVANT de savoir si la session est authentifiée (les hooks ne peuvent pas
 * être conditionnels) — sans ce garde-fou, le premier appel partirait pendant
 * l'écran de connexion/MFA, sans cookie de session, et ne serait jamais
 * relancé une fois authentifié.
 */
export function useHyperadminOffices(enabled: boolean) {
  const [state, setState] = useState<HyperadminOfficesState>({
    loading: enabled, error: null, offices: [], modules: [], superadmins: [],
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [offices, modules, superadmins] = await Promise.all([
        api.listHyperadminOffices(signal),
        api.listHyperadminModules(signal),
        api.listHyperadminSuperadmins(signal),
      ]);
      if (signal?.aborted) return;
      setState({ loading: false, error: null, offices, modules, superadmins });
    } catch (err) {
      if (signal?.aborted) return;
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Chargement impossible',
        offices: [],
        modules: [],
        superadmins: [],
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

  const createOffice = useCallback(
    async (payload: {
      subdomain: string;
      name: string;
      admin_mode: 'create' | 'attach';
      admin_username: string;
      admin_password?: string;
      admin_role?: 'admin' | 'superadmin';
    }) => {
      await api.createHyperadminOffice(payload);
      await refresh();
    },
    [refresh],
  );

  const setActive = useCallback(
    async (officeId: number, isActive: boolean) => {
      await api.updateHyperadminOffice(officeId, { is_active: isActive });
      await refresh();
    },
    [refresh],
  );

  /** Remplace l'ensemble des modules activés (PATCH idempotent, pas d'ajout unitaire). */
  const setModules = useCallback(
    async (officeId: number, slugs: string[]) => {
      await api.updateHyperadminOffice(officeId, { enabled_module_slugs: slugs });
      await refresh();
    },
    [refresh],
  );

  return { ...state, refresh, createOffice, setActive, setModules };
}
