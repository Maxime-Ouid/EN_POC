/* ===========================================================================
   Moteur de personnalisation — construction du CSS, persistance, valeurs par
   défaut. Portage TypeScript de window.TenantTheme (index_16.html).

   Différence assumée avec le prototype : ce module n'écrit PAS directement dans
   le DOM au chargement du fichier. C'est ThemeProvider.tsx qui appelle
   `applyTheme` dans un effet, pour que React reste seul propriétaire du cycle
   de vie. Le flash de couleurs par défaut que l'IIFE du prototype évitait en se
   plaçant tôt dans le <head> est traité côté index.html (voir applyThemeEarly).
   =========================================================================== */

import { composeColor, hexToRgb, parseColor } from './color';
import {
  APP_BG,
  LAYOUT_DEFAULTS,
  NAV_ACTIVE,
  NAV_DENSITY,
  NAV_PLACEMENT,
  NAV_SIZE,
  SHAPE,
  TOKEN_SCHEMA,
  TYPOGRAPHY,
  type LayoutState,
  type NavActiveKey,
  type AppBgKey,
  type NavDensityKey,
  type NavPlacement,
  type NavSizeKey,
  type ShapeKey,
  type ThemeMode,
  type TokenDef,
  type TypographyKey,
} from './schema';

export interface ThemeState {
  colors: Record<ThemeMode, Record<string, string>>;
  typography: TypographyKey;
  shape: ShapeKey;
  /** Fond de l'espace connecté (voir APP_BG dans schema.ts). */
  appBg: AppBgKey;
  /** Disposition et style de la navigation (voir LayoutState dans schema.ts). */
  layout: LayoutState;
}

/**
 * Transport du thème vers sa source de vérité (l'office, côté serveur).
 *
 * Volontairement une interface et pas un appel direct à `api` : le dossier
 * theme/ ne doit dépendre ni du client HTTP ni du backend du POC — c'est ce qui
 * permet de le monter tel quel dans le UI kit et la maquette, sans réseau. Voir
 * l'implémentation réelle dans src/api/theme.ts.
 */
export interface ThemeTransport {
  /** Thème de l'office, ou null s'il n'a jamais été personnalisé (204). */
  load: (signal?: AbortSignal) => Promise<ThemeState | null>;
  save: (state: ThemeState) => Promise<void>;
}

const STORE_PREFIX = 'ent-tenant-theme-v2';
/** id du <style> injecté dans le <head> qui porte les variables calculées. */
export const STYLE_TAG_ID = 'tenant-theme-vars';

/**
 * Sous-domaine de l'office courant (`briand-hamon.localhost` → `briand-hamon`).
 * `_` quand il n'y en a pas (localhost nu, tests, rendu hors navigateur).
 */
export function currentOfficeScope(): string {
  if (typeof window === 'undefined') return '_';
  const [label] = window.location.hostname.split('.');
  return label && label !== 'localhost' ? label.toLowerCase() : '_';
}

/**
 * Clé de stockage local, TOUJOURS suffixée par l'office.
 *
 * Sans ce suffixe, deux offices ouverts dans le même navigateur (cas normal
 * pour un utilisateur multi-études, c'est tout l'intérêt du SSO) se partagent
 * la personnalisation : le dernier qui enregistre repeint l'autre.
 *
 * Ce stockage n'est PAS la source de vérité — c'est un cache anti-flash. Le
 * thème de référence est celui de l'office, servi par GET /api/tenant-theme/.
 */
export function themeStoreKey(scope: string = currentOfficeScope()): string {
  return `${STORE_PREFIX}:${scope}`;
}

export function defaultThemeState(): ThemeState {
  const colors: Record<ThemeMode, Record<string, string>> = { light: {}, dark: {} };
  for (const t of TOKEN_SCHEMA) {
    colors.light[t.key] = t.light;
    colors.dark[t.key] = t.dark;
  }
  return {
    colors,
    typography: 'classique',
    shape: 'equilibre',
    appBg: 'degrade',
    layout: { ...LAYOUT_DEFAULTS },
  };
}

export const THEME_DEFAULTS = defaultThemeState();

function orbValue(token: TokenDef, raw: string, mode: ThemeMode): string {
  const { hex } = parseColor(raw);
  const { r, g, b } = hexToRgb(hex);
  const aFrom = (mode === 'light' ? token.aFromLight : token.aFromDark) ?? 1;
  const aTo = (mode === 'light' ? token.aToLight : token.aToDark) ?? 0;
  return `radial-gradient(circle at 30% 30%, rgba(${r},${g},${b},${aFrom}), rgba(${r},${g},${b},${aTo}))`;
}

function buildRuleBody(state: ThemeState, mode: ThemeMode): string {
  const lines: string[] = [];
  for (const t of TOKEN_SCHEMA) {
    const raw = state.colors?.[mode]?.[t.key] ?? t[mode];
    lines.push(`  --${t.key}: ${t.type === 'orb' ? orbValue(t, raw, mode) : raw};`);
  }
  const typo = TYPOGRAPHY[state.typography] ?? TYPOGRAPHY.classique;
  const shape = SHAPE[state.shape] ?? SHAPE.equilibre;
  lines.push(`  --font-display: ${typo.display};`);
  lines.push(`  --font-ui: ${typo.ui};`);
  lines.push(`  --radius-sm: ${shape.sm};`);
  lines.push(`  --radius-md: ${shape.md};`);
  lines.push(`  --radius-lg: ${shape.lg};`);
  return lines.join('\n');
}

/**
 * Variables de disposition de la navigation.
 *
 * Émises UNIQUEMENT dans le bloc :root, pas dans les blocs sombres : une
 * largeur de rail n'a aucune raison de changer avec le thème, et les répéter
 * ferait croire le contraire au prochain lecteur. Les blocs sombres ne
 * redéclarent que ce qu'ils changent ; le reste est hérité de :root.
 */
function buildLayoutBody(layout: LayoutState): string {
  const size = NAV_SIZE[layout.navSize] ?? NAV_SIZE.large;
  const density = NAV_DENSITY[layout.navDensity] ?? NAV_DENSITY.confortable;
  return [
    `  --nav-w: ${size.width};`,
    `  --nav-h: ${size.barHeight};`,
    `  --nav-item-pad-y: ${density.padY};`,
    `  --nav-item-pad-x: ${density.padX};`,
    `  --nav-item-gap: ${density.gap};`,
    `  --nav-item-spacing: ${density.itemGap};`,
    `  --nav-icon-size: ${density.iconSize};`,
    `  --nav-font-size: ${density.fontSize};`,
  ].join('\n');
}

/**
 * Feuille de style complète : :root (clair), variante sombre par
 * prefers-color-scheme (sauf si data-theme="light" force le clair), et
 * :root[data-theme="dark"] qui l'emporte dans les deux sens.
 */
export function buildThemeCss(state: ThemeState): string {
  const lightCss = `${buildRuleBody(state, 'light')}\n${buildLayoutBody(state.layout)}`;
  const darkCss = buildRuleBody(state, 'dark');
  const darkIndented = darkCss
    .split('\n')
    .map(l => `  ${l}`)
    .join('\n');
  return (
    `:root{\n${lightCss}\n}\n` +
    `@media (prefers-color-scheme: dark){\n  :root:not([data-theme="light"]){\n${darkIndented}\n  }\n}\n` +
    `:root[data-theme="dark"]{\n${darkCss}\n}\n`
  );
}

/**
 * Pose sur <html> ce qui ne peut PAS passer par une variable CSS : le placement
 * de la navigation, le mode réduit et la forme de l'indicateur d'actif. Une
 * custom property ne déplace pas un élément fixe d'un bord à l'autre et ne
 * transforme pas une pastille de fond en trait latéral — il faut un sélecteur.
 */
export function applyLayoutAttributes(layout: LayoutState): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-nav-placement', layout.navPlacement);
  el.setAttribute('data-nav-size', layout.navSize);
  el.setAttribute('data-nav-active', layout.navActive);
}

/** Écrit (ou crée) le <style id="tenant-theme-vars"> dans le <head>. */
export function applyTheme(state: ThemeState): void {
  if (typeof document === 'undefined') return;
  let tag = document.getElementById(STYLE_TAG_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = buildThemeCss(state);
  applyLayoutAttributes(state.layout);
  // Le fond ne peut pas être une variable : il change la nature de
  // l'image de fond (halos, filet, grain), pas seulement sa couleur.
  document.documentElement.setAttribute('data-appbg', state.appBg);
}

/** Complète/valide un état venant du stockage ou de l'API — jamais confiance brute. */
export function normalizeThemeState(raw: unknown): ThemeState {
  const state = defaultThemeState();
  if (!raw || typeof raw !== 'object') return state;
  const candidate = raw as Partial<ThemeState>;

  if (candidate.colors && typeof candidate.colors === 'object') {
    for (const mode of ['light', 'dark'] as ThemeMode[]) {
      const modeColors = candidate.colors[mode];
      if (!modeColors || typeof modeColors !== 'object') continue;
      for (const t of TOKEN_SCHEMA) {
        const v = (modeColors as Record<string, unknown>)[t.key];
        if (typeof v === 'string') state.colors[mode][t.key] = v;
      }
    }
  }
  if (candidate.typography && candidate.typography in TYPOGRAPHY) {
    state.typography = candidate.typography;
  }
  if (candidate.shape && candidate.shape in SHAPE) {
    state.shape = candidate.shape;
  }
  // Absent est le cas NORMAL pour tout thème enregistré avant l'ajout des
  // fonds : il doit continuer à afficher le dégradé, pas un fond vide.
  if (candidate.appBg && candidate.appBg in APP_BG) {
    state.appBg = candidate.appBg;
  }
  state.layout = normalizeLayoutState(candidate.layout);
  return state;
}

/**
 * Complète un bloc `layout` partiel ou absent.
 *
 * Absent est le cas NORMAL, pas une anomalie : tous les thèmes enregistrés
 * avant l'ajout de ce bloc n'en ont pas. Ils doivent continuer à s'afficher
 * exactement comme avant, d'où le retour aux valeurs par défaut clé par clé
 * plutôt qu'un rejet de l'objet entier.
 */
export function normalizeLayoutState(raw: unknown): LayoutState {
  const layout: LayoutState = { ...LAYOUT_DEFAULTS };
  if (!raw || typeof raw !== 'object') return layout;
  const c = raw as Partial<LayoutState>;

  if (c.navPlacement && c.navPlacement in NAV_PLACEMENT) {
    layout.navPlacement = c.navPlacement as NavPlacement;
  }
  if (c.navSize && c.navSize in NAV_SIZE) layout.navSize = c.navSize as NavSizeKey;
  if (c.navDensity && c.navDensity in NAV_DENSITY) layout.navDensity = c.navDensity as NavDensityKey;
  if (c.navActive && c.navActive in NAV_ACTIVE) layout.navActive = c.navActive as NavActiveKey;

  for (const key of ['showSectionLabels', 'showBadges', 'showPoweredBy'] as const) {
    if (typeof c[key] === 'boolean') layout[key] = c[key];
  }
  return layout;
}

/** Lit le cache local de CET office. Renvoie null si rien n'y est enregistré. */
export function readCachedThemeState(): ThemeState | null {
  try {
    const s = localStorage.getItem(themeStoreKey());
    if (!s) return null;
    return normalizeThemeState(JSON.parse(s));
  } catch {
    /* stockage indisponible (navigation privée, quota) ou JSON abîmé */
    return null;
  }
}

export function loadThemeState(): ThemeState {
  return readCachedThemeState() ?? defaultThemeState();
}

export function persistThemeState(state: ThemeState): void {
  try {
    localStorage.setItem(themeStoreKey(), JSON.stringify(state));
  } catch {
    /* idem : la personnalisation reste appliquée en mémoire pour la session */
  }
}

export function clearPersistedThemeState(): void {
  try {
    localStorage.removeItem(themeStoreKey());
  } catch {
    /* rien à faire */
  }
}

/** Écrit une couleur dans un état (renvoie une COPIE — état React immuable). */
export function withColor(
  state: ThemeState,
  mode: ThemeMode,
  key: string,
  hex: string,
  alpha = 1,
): ThemeState {
  return {
    ...state,
    colors: {
      ...state.colors,
      [mode]: { ...state.colors[mode], [key]: composeColor(hex, alpha) },
    },
  };
}

/** Écrit un réglage de disposition (renvoie une COPIE — état React immuable). */
export function withLayout(state: ThemeState, patch: Partial<LayoutState>): ThemeState {
  return { ...state, layout: { ...state.layout, ...patch } };
}

/**
 * À appeler avant le premier rendu React (main.tsx) pour éviter un flash des
 * couleurs Notantis par défaut quand un thème personnalisé est enregistré —
 * c'est ce que faisait l'IIFE placée tôt dans le <head> du prototype.
 */
export function applyThemeEarly(): ThemeState {
  const state = loadThemeState();
  applyTheme(state);
  return state;
}
