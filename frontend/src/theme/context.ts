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
  /**
   * Message d'erreur du dernier enregistrement serveur, null si tout va bien.
   * Non nul = ce qui est affiché n'est PAS ce qui est enregistré pour l'office :
   * l'écran doit le dire, sinon l'utilisateur croit avoir enregistré.
   */
  saveError: string | null;
  /**
   * Recharge le thème depuis le serveur (à appeler après une connexion : au
   * montage, l'utilisateur est encore anonyme et l'API répond 403).
   */
  syncFromServer: () => Promise<void>;
}

// Contexte isolé dans son propre fichier pour que ThemeProvider.tsx n'exporte
// qu'un composant (contrainte du Fast Refresh de Vite).
export const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);
