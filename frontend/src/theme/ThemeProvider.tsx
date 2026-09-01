/* Le thème du serveur est chargé au montage : `syncFromServer` n'écrit l'état
   qu'APRÈS le premier await (la requête réseau). La règle
   react/set-state-in-effect ne distingue pas un setState synchrone d'un setState
   post-await ; elle est neutralisée ici, et uniquement ici, comme dans
   src/hooks/useSession.ts. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyTheme,
  clearPersistedThemeState,
  defaultThemeState,
  loadThemeState,
  persistThemeState,
  withColor,
  withLayout,
  type ThemeState,
  type ThemeTransport,
} from './engine';
import type { AppBgKey, LayoutState, ShapeKey, ThemeMode, TypographyKey } from './schema';
import { TenantThemeContext, type TenantThemeContextValue } from './context';

const SAVE_FLASH_MS = 1600;

export interface ThemeProviderProps {
  children?: ReactNode;
  /** État initial imposé (ex. cache local appliqué avant le premier rendu). */
  initialState?: ThemeState;
  /**
   * `false` pour ne pas relire/écrire localStorage — utile quand le thème
   * vient du backend et ne doit pas être écrasé par un cache navigateur.
   */
  persist?: boolean;
  /**
   * Accès au thème enregistré côté serveur pour l'office courant. Absent (UI
   * kit, maquette, tests), la personnalisation reste locale au navigateur :
   * c'est exactement le comportement d'avant, en mode dégradé assumé.
   */
  transport?: ThemeTransport;
}

// Fournit le moteur de personnalisation à l'arbre React. Monte le <style> des
// variables CSS et le tient à jour à chaque changement d'état ; pose aussi
// data-theme sur <html> pour que l'aperçu corresponde toujours au thème édité.
export function ThemeProvider({
  children,
  initialState,
  persist = true,
  transport,
}: ThemeProviderProps) {
  const [state, setState] = useState<ThemeState>(
    () => initialState ?? (persist ? loadThemeState() : defaultThemeState()),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editMode, setEditModeState] = useState<ThemeMode>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light',
  );
  const [justSaved, setJustSaved] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Une seule source de vérité pour le CSS : l'état. Tout changement d'état
  // réécrit le <style>, y compris pendant un glissement de curseur de couleur.
  useEffect(() => {
    applyTheme(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const setEditMode = useCallback((mode: ThemeMode) => {
    setEditModeState(mode);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }, []);

  const flashSaved = useCallback(() => {
    setJustSaved(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustSaved(false), SAVE_FLASH_MS);
  }, []);

  const setColor = useCallback(
    (key: string, hex: string, alpha = 1) => {
      setState(prev => withColor(prev, editMode, key, hex, alpha));
    },
    [editMode],
  );

  /**
   * Enregistre : cache local d'abord (immédiat, c'est ce qui évite le flash au
   * prochain chargement), puis serveur. Une erreur réseau n'annule pas ce qui
   * est affiché — elle est exposée par `saveError` pour que l'écran puisse dire
   * que rien n'est parti.
   */
  const save = useCallback(
    (next: ThemeState) => {
      if (persist) persistThemeState(next);
      flashSaved();
      if (!transport) return;
      setSaveError(null);
      transport.save(next).catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : 'Enregistrement impossible');
      });
    },
    [persist, transport, flashSaved],
  );

  const commit = useCallback(() => {
    setState(prev => {
      save(prev);
      return prev;
    });
  }, [save]);

  const setTypography = useCallback(
    (key: TypographyKey) => {
      setState(prev => {
        const next = { ...prev, typography: key };
        save(next);
        return next;
      });
    },
    [save],
  );

  const setShape = useCallback(
    (key: ShapeKey) => {
      setState(prev => {
        const next = { ...prev, shape: key };
        save(next);
        return next;
      });
    },
    [save],
  );

  const setAppBg = useCallback(
    (key: AppBgKey) => {
      setState(prev => {
        const next = { ...prev, appBg: key };
        save(next);
        return next;
      });
    },
    [save],
  );

  const setLayout = useCallback(
    (patch: Partial<LayoutState>) => {
      setState(prev => {
        const next = withLayout(prev, patch);
        save(next);
        return next;
      });
    },
    [save],
  );

  const reset = useCallback(() => {
    if (persist) clearPersistedThemeState();
    const defaults = defaultThemeState();
    setState(defaults);
    flashSaved();
    if (!transport) return;
    setSaveError(null);
    // Revenir aux valeurs d'origine est aussi une décision de l'office : elle
    // doit atteindre le serveur, sinon le thème réapparaît au rechargement.
    transport.save(defaults).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Enregistrement impossible');
    });
  }, [persist, transport, flashSaved]);

  /**
   * Le serveur fait foi. Un échec (403 avant connexion, backend injoignable)
   * laisse volontairement le cache local en place : mieux vaut l'apparence de
   * l'office au dernier chargement connu qu'un retour brutal aux couleurs
   * Notantis.
   */
  const syncFromServer = useCallback(async () => {
    if (!transport) return;
    try {
      const remote = await transport.load();
      if (remote) {
        setState(remote);
        if (persist) persistThemeState(remote);
      }
    } catch {
      /* thème du cache conservé */
    }
  }, [transport, persist]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  const value = useMemo<TenantThemeContextValue>(
    () => ({
      state,
      editMode,
      setEditMode,
      setColor,
      commit,
      setTypography,
      setShape,
      setAppBg,
      setLayout,
      reset,
      justSaved,
      saveError,
      syncFromServer,
    }),
    [
      state,
      editMode,
      setEditMode,
      setColor,
      commit,
      setTypography,
      setShape,
      setAppBg,
      setLayout,
      reset,
      justSaved,
      saveError,
      syncFromServer,
    ],
  );

  return <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>;
}
