import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyTheme,
  clearPersistedThemeState,
  defaultThemeState,
  loadThemeState,
  persistThemeState,
  withColor,
  type ThemeState,
} from './engine';
import type { ShapeKey, ThemeMode, TypographyKey } from './schema';
import { TenantThemeContext, type TenantThemeContextValue } from './context';

const SAVE_FLASH_MS = 1600;

export interface ThemeProviderProps {
  children?: ReactNode;
  /** État initial imposé (ex. thème renvoyé par l'API pour cet office). */
  initialState?: ThemeState;
  /**
   * `false` pour ne pas relire/écrire localStorage — utile quand le thème
   * vient du backend et ne doit pas être écrasé par un cache navigateur.
   */
  persist?: boolean;
}

// Fournit le moteur de personnalisation à l'arbre React. Monte le <style> des
// variables CSS et le tient à jour à chaque changement d'état ; pose aussi
// data-theme sur <html> pour que l'aperçu corresponde toujours au thème édité.
export function ThemeProvider({ children, initialState, persist = true }: ThemeProviderProps) {
  const [state, setState] = useState<ThemeState>(
    () => initialState ?? (persist ? loadThemeState() : defaultThemeState()),
  );
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

  const commit = useCallback(() => {
    setState(prev => {
      if (persist) persistThemeState(prev);
      return prev;
    });
    flashSaved();
  }, [persist, flashSaved]);

  const setTypography = useCallback(
    (key: TypographyKey) => {
      setState(prev => {
        const next = { ...prev, typography: key };
        if (persist) persistThemeState(next);
        return next;
      });
      flashSaved();
    },
    [persist, flashSaved],
  );

  const setShape = useCallback(
    (key: ShapeKey) => {
      setState(prev => {
        const next = { ...prev, shape: key };
        if (persist) persistThemeState(next);
        return next;
      });
      flashSaved();
    },
    [persist, flashSaved],
  );

  const reset = useCallback(() => {
    if (persist) clearPersistedThemeState();
    setState(defaultThemeState());
    flashSaved();
  }, [persist, flashSaved]);

  const value = useMemo<TenantThemeContextValue>(
    () => ({
      state,
      editMode,
      setEditMode,
      setColor,
      commit,
      setTypography,
      setShape,
      reset,
      justSaved,
    }),
    [state, editMode, setEditMode, setColor, commit, setTypography, setShape, reset, justSaved],
  );

  return <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>;
}
