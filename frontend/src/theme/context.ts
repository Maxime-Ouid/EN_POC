import { createContext } from 'react';
import type { ThemeState } from './engine';
import type { AppBgKey, LayoutState, ShapeKey, ThemeMode, TypographyKey } from './schema';

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
  setAppBg: (key: AppBgKey) => void;
  /**
   * Modifie un ou plusieurs réglages de navigation et enregistre.
   * Un patch partiel, pas un état complet : l'écran Apparence ne touche jamais
   * qu'un réglage à la fois, et les autres ne doivent pas être réécrits par
   * inadvertance avec les valeurs qu'ils avaient au rendu précédent.
   */
  setLayout: (patch: Partial<LayoutState>) => void;
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
  /**
   * Rail replié par la personne devant l'écran (icônes seules). Ce n'est PAS un
   * réglage d'office : rien n'en part vers le serveur, et `state.layout.navSize`
   * continue de porter le choix de l'office — voir engine.ts, `withCollapsedNav`.
   */
  navCollapsed: boolean;
  /**
   * Faux quand il n'y a rien à replier : office déjà en « icônes seules », ou
   * navigation en barre d'onglets. Le bouton ne doit alors pas être affiché.
   */
  navCollapsible: boolean;
  toggleNavCollapsed: () => void;
}

// Contexte isolé dans son propre fichier pour que ThemeProvider.tsx n'exporte
// qu'un composant (contrainte du Fast Refresh de Vite).
export const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);
