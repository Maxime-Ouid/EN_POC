/* ===========================================================================
   Référentiel des variables de thème éditables (« marque grise »).

   C'est LE référentiel : il pilote à la fois le CSS généré (engine.ts) et la
   génération de l'écran Personnalisation → Apparence (screens/settings/
   AppearanceTab.tsx). Aucune couleur n'est câblée en dur dans l'écran.

   Trois miroirs existent et doivent rester alignés :
     - ce fichier (front React)
     - index_16.html, IIFE window.TenantTheme (prototype HTML de référence)
     - NotantisApp/design-system/tokens.py, TOKEN_SCHEMA (côté Python)

   Choix produit assumé (demande explicite de Jean-Marie, 26/08/2026) : CHAQUE
   variable est exposée individuellement, par thème clair et sombre séparément
   — pas de dérivation automatique en HSL depuis 2 couleurs ancres. Le garde-fou
   de cohérence par construction n'existe donc pas ; voir DESIGN_SYSTEM.md §9.
   =========================================================================== */

export type ThemeMode = 'light' | 'dark';

/** hex  : couleur opaque (un seul input color).
 *  rgba : couleur + opacité réglable.
 *  orb  : halo radial à 2 arrêts (formes flottantes). Un seul input pilote la
 *         teinte ; l'écart d'opacité centre/bord reste fixe par thème pour
 *         conserver l'effet de lueur au lieu d'un disque plein. */
export type TokenType = 'hex' | 'rgba' | 'orb';

export interface TokenDef {
  key: string;
  group: string;
  label: string;
  type: TokenType;
  light: string;
  dark: string;
  aFromLight?: number;
  aToLight?: number;
  aFromDark?: number;
  aToDark?: number;
}

export interface TokenGroup {
  id: string;
  label: string;
}

export const TOKEN_SCHEMA: readonly TokenDef[] = [
  { key: 'bg', group: 'surfaces', label: 'Fond de page', type: 'hex', light: '#fafafd', dark: '#100d1f' },
  { key: 'surface', group: 'surfaces', label: 'Surface (cartes, champs, modales)', type: 'hex', light: '#ffffff', dark: '#171330' },
  { key: 'surface-alt', group: 'surfaces', label: 'Surface secondaire', type: 'hex', light: '#f5f4fb', dark: '#1c1740' },
  { key: 'border', group: 'surfaces', label: 'Bordure standard', type: 'hex', light: '#e5e2f0', dark: '#332a5e' },
  { key: 'border-soft', group: 'surfaces', label: 'Séparateur discret', type: 'hex', light: '#eeecf7', dark: '#2a2350' },

  { key: 'app-grad-base-from', group: 'appbg', label: 'Dégradé — départ', type: 'hex', light: '#f2eeff', dark: '#100d1f' },
  { key: 'app-grad-base-to', group: 'appbg', label: 'Dégradé — arrivée', type: 'hex', light: '#ecf1ff', dark: '#1c1740' },
  { key: 'app-grad-1', group: 'appbg', label: 'Halo haut-gauche', type: 'rgba', light: '#ede4ff', dark: 'rgba(150,104,244,.16)' },
  { key: 'app-grad-2', group: 'appbg', label: 'Halo haut-droite', type: 'rgba', light: '#b8cdff', dark: 'rgba(91,123,251,.14)' },
  { key: 'app-grad-3', group: 'appbg', label: 'Halo bas-droite', type: 'rgba', light: 'rgba(166,140,255,.369)', dark: 'rgba(150,104,244,.10)' },
  { key: 'app-grad-4', group: 'appbg', label: 'Halo bas-gauche', type: 'rgba', light: '#c8e2f2', dark: 'rgba(80,208,253,.08)' },
  { key: 'app-orb', group: 'appbg', label: 'Formes flottantes', type: 'orb', light: '#ffffff', dark: '#ffffff', aFromLight: 0.55, aToLight: 0.04, aFromDark: 0.22, aToDark: 0.02 },

  { key: 'card-bg', group: 'cards', label: 'Fond des cartes', type: 'rgba', light: 'rgba(255,255,255,.5)', dark: 'rgba(23,19,48,.55)' },
  { key: 'card-border', group: 'cards', label: 'Bordure des cartes', type: 'rgba', light: 'rgba(255,255,255,.65)', dark: 'rgba(255,255,255,.08)' },
  { key: 'card-glass-bg', group: 'cards', label: 'Fond de la barre du haut', type: 'rgba', light: 'rgb(255 255 255 / 85%)', dark: 'rgba(28,23,64,.75)' },
  { key: 'card-glass-border', group: 'cards', label: 'Bordure de la barre du haut', type: 'rgba', light: 'rgba(255,255,255,.7)', dark: 'rgba(255,255,255,.12)' },

  { key: 'ink-900', group: 'text', label: 'Texte principal', type: 'hex', light: '#211c3d', dark: '#efedf7' },
  { key: 'ink-800', group: 'text', label: 'Texte secondaire fort', type: 'hex', light: '#342f52', dark: '#ddd9ec' },
  { key: 'ink-700', group: 'text', label: 'Libellés de formulaire', type: 'hex', light: '#5b5773', dark: '#b3aecb' },
  { key: 'ink-500', group: 'text', label: 'Texte atténué', type: 'hex', light: '#7d7896', dark: '#9d97ba' },
  { key: 'ink-400', group: 'text', label: 'Texte le plus discret (icônes incluses)', type: 'hex', light: '#8783a0', dark: '#8983a8' },

  { key: 'brand-ink', group: 'brand', label: 'Couleur principale', type: 'hex', light: '#1a1258', dark: '#1a1258' },
  { key: 'brand-ink-hover', group: 'brand', label: 'Survol du bouton principal', type: 'hex', light: '#241a63', dark: '#241a63' },
  { key: 'brass-700', group: 'brand', label: 'Accent — foncé', type: 'hex', light: '#6b3fd4', dark: '#b99cf7' },
  { key: 'brass-600', group: 'brand', label: 'Accent — bouton', type: 'hex', light: '#7d52dc', dark: '#ab8ff5' },
  { key: 'brass-500', group: 'brand', label: "Couleur d'accent", type: 'hex', light: '#9668f4', dark: '#9668f4' },
  { key: 'brass-400', group: 'brand', label: 'Accent — clair', type: 'hex', light: '#ab84f7', dark: '#8656d9' },
  { key: 'brass-100', group: 'brand', label: 'Accent — fond de badge', type: 'rgba', light: '#f0e9fc', dark: 'rgba(150,104,244,.16)' },

  { key: 'shell-bg', group: 'sidebar', label: 'Fond de la sidebar', type: 'hex', light: '#1a1258', dark: '#140d42' },
  { key: 'shell-bg-2', group: 'sidebar', label: "Fond — sélecteur d'office", type: 'hex', light: '#2c2170', dark: '#1c1558' },
  { key: 'shell-text', group: 'sidebar', label: 'Texte de la sidebar', type: 'hex', light: '#ffffff', dark: '#ffffff' },
  { key: 'shell-text-dim', group: 'sidebar', label: 'Texte atténué de la sidebar', type: 'hex', light: '#b6acdb', dark: '#a89ed4' },
  { key: 'shell-active', group: 'sidebar', label: 'Item de navigation actif', type: 'hex', light: '#342a7a', dark: '#2c2170' },
  { key: 'shell-border', group: 'sidebar', label: 'Séparateurs internes', type: 'rgba', light: 'rgba(255,255,255,.10)', dark: 'rgba(255,255,255,.08)' },
  { key: 'brand-strong', group: 'sidebar', label: "Nom d'utilisateur (pied de sidebar)", type: 'hex', light: '#2a1c66', dark: '#ffffff' },
  { key: 'brand-soft', group: 'sidebar', label: 'Mention "propulsé par"', type: 'hex', light: '#4e3f96', dark: '#a89ed4' },
  { key: 'nav-dim', group: 'sidebar', label: 'Icônes de navigation inactives', type: 'hex', light: '#2f206f', dark: '#a89ed4' },
  { key: 'nav-label-c', group: 'sidebar', label: 'Libellés de section ("GÉNÉRAL"…)', type: 'hex', light: '#372979', dark: '#a89ed4' },

  { key: 'success', group: 'status', label: 'Succès — texte/icône', type: 'hex', light: '#2f8f5b', dark: '#7fbf9c' },
  { key: 'success-bg', group: 'status', label: 'Succès — fond', type: 'rgba', light: '#e4f5ec', dark: 'rgba(47,143,91,.18)' },
  { key: 'warning', group: 'status', label: 'Alerte — texte/icône', type: 'hex', light: '#b9820f', dark: '#e3b25b' },
  { key: 'warning-bg', group: 'status', label: 'Alerte — fond', type: 'rgba', light: '#fbf0d6', dark: 'rgba(185,130,15,.20)' },
  { key: 'critical', group: 'status', label: 'Bloquant — texte/icône', type: 'hex', light: '#c13f3f', dark: '#e08a8a' },
  { key: 'critical-bg', group: 'status', label: 'Bloquant — fond', type: 'rgba', light: '#fbe6e6', dark: 'rgba(193,63,63,.20)' },
  { key: 'info', group: 'status', label: 'Info — texte/icône', type: 'hex', light: '#5b7bfb', dark: '#8fa8ff' },
  { key: 'info-bg', group: 'status', label: 'Info — fond', type: 'rgba', light: '#e9edfe', dark: 'rgba(91,123,251,.20)' },

  { key: 'login-grad-1', group: 'login', label: 'Halo 1', type: 'rgba', light: 'rgba(150,104,244,.14)', dark: 'rgba(150,104,244,.18)' },
  { key: 'login-grad-2', group: 'login', label: 'Halo 2', type: 'rgba', light: 'rgba(80,208,253,.24)', dark: 'rgba(80,208,253,.26)' },
  { key: 'login-grad-3', group: 'login', label: 'Halo 3', type: 'rgba', light: 'rgba(91,123,251,.13)', dark: 'rgba(91,123,251,.15)' },
  { key: 'login-grad-4', group: 'login', label: 'Halo 4', type: 'rgba', light: 'rgba(107,63,212,.17)', dark: 'rgba(171,143,245,.16)' },
  { key: 'login-orb', group: 'login', label: 'Formes flottantes', type: 'orb', light: '#ffffff', dark: '#ffffff', aFromLight: 0.95, aToLight: 0.05, aFromDark: 0.2, aToDark: 0.02 },
  { key: 'login-glass-bg', group: 'login', label: 'Fond de la carte de connexion', type: 'rgba', light: 'rgba(255,255,255,.72)', dark: 'rgba(28,23,64,.62)' },
  { key: 'login-glass-border', group: 'login', label: 'Bordure de la carte de connexion', type: 'rgba', light: 'rgba(255,255,255,.85)', dark: 'rgba(255,255,255,.14)' },
  { key: 'login-badge-bg', group: 'login', label: 'Fond du badge Id.Not', type: 'rgba', light: 'rgba(255,255,255,.08)', dark: 'rgba(255,255,255,.06)' },
  { key: 'login-badge-border', group: 'login', label: 'Bordure du badge Id.Not', type: 'rgba', light: 'rgba(255,255,255,.16)', dark: 'rgba(255,255,255,.14)' },
] as const;

export const TOKEN_GROUPS: readonly TokenGroup[] = [
  { id: 'surfaces', label: 'Fonds & surfaces' },
  { id: 'appbg', label: 'Dégradé de fond (tableau de bord)' },
  { id: 'cards', label: 'Cartes (effet verre)' },
  { id: 'text', label: 'Texte' },
  { id: 'brand', label: 'Marque & accent' },
  { id: 'sidebar', label: 'Barre latérale' },
  { id: 'status', label: 'Statuts' },
  { id: 'login', label: 'Écran de connexion' },
] as const;

export type TypographyKey = 'classique' | 'moderne' | 'editorial';

export interface TypographyPreset {
  label: string;
  display: string;
  ui: string;
  /** Police utilisée pour l'échantillon "Aa" de la vignette de preset. */
  sampleFont: string;
  desc: string;
}

export const TYPOGRAPHY: Record<TypographyKey, TypographyPreset> = {
  classique: {
    label: 'Classique',
    display: "'Poppins','Segoe UI',sans-serif",
    ui: "'Inter',-apple-system,'Segoe UI',sans-serif",
    sampleFont: "'Poppins',sans-serif",
    desc: 'Poppins / Inter',
  },
  moderne: {
    label: 'Moderne',
    display: "'Sora','Segoe UI',sans-serif",
    ui: "'Inter',-apple-system,'Segoe UI',sans-serif",
    sampleFont: "'Sora',sans-serif",
    desc: 'Sora / Inter',
  },
  editorial: {
    label: 'Éditorial',
    display: "'Fraunces',Georgia,serif",
    ui: "'Inter',-apple-system,'Segoe UI',sans-serif",
    sampleFont: "'Fraunces',serif",
    desc: 'Fraunces / Inter',
  },
};

export type ShapeKey = 'anguleux' | 'equilibre' | 'arrondi';

export interface ShapePreset {
  label: string;
  sm: string;
  md: string;
  lg: string;
  /** Rayon de la vignette d'aperçu du preset (valeur du prototype). */
  swatchRadius: string;
}

export const SHAPE: Record<ShapeKey, ShapePreset> = {
  anguleux: { label: 'Anguleux', sm: '4px', md: '6px', lg: '10px', swatchRadius: '4px' },
  equilibre: { label: 'Équilibré', sm: '6px', md: '10px', lg: '16px', swatchRadius: '9px' },
  arrondi: { label: 'Arrondi', sm: '8px', md: '14px', lg: '22px', swatchRadius: '15px' },
};

export const TYPOGRAPHY_KEYS = Object.keys(TYPOGRAPHY) as TypographyKey[];
export const SHAPE_KEYS = Object.keys(SHAPE) as ShapeKey[];

/* ===========================================================================
   Disposition et style de la navigation.

   Même principe que les couleurs : ce fichier est LE référentiel. L'écran
   Personnalisation → Apparence est généré depuis ces tables, le CSS est
   généré depuis leurs valeurs (engine.ts), et rien n'est écrit en dur des
   deux côtés.

   Deux natures de réglage, à ne pas confondre :
     - ce qui se traduit en VALEUR (largeur, hauteur, espacements) sort en
       custom properties `--nav-*` ;
     - ce qui change la STRUCTURE du rendu (placement, mode réduit, forme de
       l'indicateur d'actif) sort en attributs `data-nav-*` sur <html>, parce
       qu'une variable CSS ne peut pas déplacer un élément ni en changer la
       nature. C'est aussi ce qui permet à AppShell de savoir, en React, s'il
       doit monter un rail vertical ou une barre d'onglets.
   =========================================================================== */

export type NavPlacement = 'left' | 'right' | 'top' | 'bottom';
export type NavSizeKey = 'large' | 'compact' | 'rail';
export type NavDensityKey = 'dense' | 'confortable' | 'aere';
export type NavActiveKey = 'plein' | 'barre' | 'point' | 'contour' | 'texte';

export interface NavPlacementPreset {
  label: string;
  desc: string;
  /** Vrai pour « en haut » et « en bas » : barre d'onglets, pas rail vertical. */
  horizontal: boolean;
}

export const NAV_PLACEMENT: Record<NavPlacement, NavPlacementPreset> = {
  left: { label: 'À gauche', desc: 'Rail vertical — disposition actuelle', horizontal: false },
  right: { label: 'À droite', desc: 'Rail vertical, côté opposé', horizontal: false },
  top: { label: 'En haut', desc: "Barre d'onglets au-dessus du contenu", horizontal: true },
  bottom: { label: 'En bas', desc: "Barre d'onglets ancrée en bas de l'écran", horizontal: true },
};

export interface NavSizePreset {
  label: string;
  desc: string;
  /** Largeur du rail. Sans effet quand la navigation est horizontale. */
  width: string;
  /** Hauteur de la barre d'onglets. Sans effet quand la navigation est verticale. */
  barHeight: string;
  /** Faux = icônes seules ; le libellé n'apparaît qu'au survol, en infobulle. */
  labels: boolean;
}

export const NAV_SIZE: Record<NavSizeKey, NavSizePreset> = {
  large: { label: 'Large', desc: 'Libellés visibles, 236 px', width: '236px', barHeight: '62px', labels: true },
  compact: { label: 'Compact', desc: 'Libellés visibles, 192 px', width: '192px', barHeight: '54px', labels: true },
  rail: { label: 'Icônes seules', desc: 'Libellé au survol, 62 px', width: '62px', barHeight: '52px', labels: false },
};

export interface NavDensityPreset {
  label: string;
  desc: string;
  padY: string;
  padX: string;
  /** Écart icône ↔ libellé. */
  gap: string;
  /** Écart vertical entre deux entrées. */
  itemGap: string;
  iconSize: string;
  fontSize: string;
}

export const NAV_DENSITY: Record<NavDensityKey, NavDensityPreset> = {
  dense: { label: 'Dense', desc: 'Plus de rubriques sans défilement', padY: '5px', padX: '9px', gap: '8px', itemGap: '0px', iconSize: '15px', fontSize: '12.6px' },
  confortable: { label: 'Confortable', desc: 'Réglage actuel', padY: '8px', padX: '10px', gap: '10px', itemGap: '1px', iconSize: '16px', fontSize: '13.3px' },
  aere: { label: 'Aéré', desc: 'Cibles plus grandes, écrans tactiles', padY: '11px', padX: '12px', gap: '12px', itemGap: '4px', iconSize: '18px', fontSize: '14px' },
};

export interface NavActivePreset {
  label: string;
  desc: string;
}

export const NAV_ACTIVE: Record<NavActiveKey, NavActivePreset> = {
  plein: { label: 'Fond plein', desc: 'Pastille de fond — réglage actuel' },
  barre: { label: 'Barre', desc: "Trait d'accent sur le bord de l'entrée" },
  point: { label: 'Point', desc: "Point d'accent devant le libellé" },
  contour: { label: 'Contour', desc: "Bordure d'accent, fond transparent" },
  texte: { label: 'Texte accentué', desc: 'Icône et libellé colorés, rien de plus' },
};

/** Interrupteurs binaires de la navigation, générés dans l'écran Apparence. */
export interface NavToggleDef {
  key: 'showSectionLabels' | 'showBadges' | 'showPoweredBy';
  label: string;
  desc: string;
}

export const NAV_TOGGLES: readonly NavToggleDef[] = [
  {
    key: 'showSectionLabels',
    label: 'Intitulés de section',
    desc: 'Affiche « GÉNÉRAL », « GESTION »… au-dessus de chaque groupe.',
  },
  {
    key: 'showBadges',
    label: 'Compteurs',
    desc: 'Pastilles chiffrées sur les rubriques (dossiers en cours, messages non lus…).',
  },
  {
    key: 'showPoweredBy',
    label: 'Mention « propulsé par Notantis »',
    desc: "Au pied de la navigation. Sa suppression relève du contrat de marque grise, pas du goût.",
  },
] as const;

export interface LayoutState {
  navPlacement: NavPlacement;
  navSize: NavSizeKey;
  navDensity: NavDensityKey;
  navActive: NavActiveKey;
  showSectionLabels: boolean;
  showBadges: boolean;
  showPoweredBy: boolean;
}

/** Valeurs par défaut = comportement d'avant l'ajout de ce bloc, à l'identique. */
export const LAYOUT_DEFAULTS: LayoutState = {
  navPlacement: 'left',
  navSize: 'large',
  navDensity: 'confortable',
  navActive: 'plein',
  showSectionLabels: false,
  showBadges: true,
  showPoweredBy: true,
};

export const NAV_PLACEMENT_KEYS = Object.keys(NAV_PLACEMENT) as NavPlacement[];
export const NAV_SIZE_KEYS = Object.keys(NAV_SIZE) as NavSizeKey[];
export const NAV_DENSITY_KEYS = Object.keys(NAV_DENSITY) as NavDensityKey[];
export const NAV_ACTIVE_KEYS = Object.keys(NAV_ACTIVE) as NavActiveKey[];

/** Vrai si le placement demandé est une barre d'onglets horizontale. */
export function isHorizontalNav(placement: NavPlacement): boolean {
  return NAV_PLACEMENT[placement]?.horizontal ?? false;
}
