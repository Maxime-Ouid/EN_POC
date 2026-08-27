import { createContext } from 'react';
import type { ThemeState } from './engine';
import type { ShapeKey, ThemeMode, TypographyKey } from './schema';

export interface TenantThemeContextValue {
  /** État courant du thème (couleurs par mode + presets typo/formes). */
  state: ThemeState;
  /** Thème en cours d'édition ET prévisualisé (data-theme sur <html>). */
  editMode: ThemeMode;
  setEditMode: (mode: ThemeMode) => void;
  /** Applique une couleur en direct, sans enregistrer (glissement du curseur). */
  setColor: (key: string, hex: string, alpha?: number) => void;
  /** Enregistre l'état courant et déclenche l'indicateur « Enregistré ». */
  commit: () => void;
  setTypography: (key: TypographyKey) => void;
  setShape: (key: ShapeKey) => void;
  /** Revient aux valeurs Notantis d'origine et efface le thème enregistré. */
  reset: () => void;
  /** Vrai pendant ~1,6 s après un enregistrement — pilote le badge « Enregistré ». */
  justSaved: boolean;
}

// Contexte isolé dans son propre fichier pour que ThemeProvider.tsx n'exporte
// qu'un composant (contrainte du Fast Refresh de Vite).
export const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);
