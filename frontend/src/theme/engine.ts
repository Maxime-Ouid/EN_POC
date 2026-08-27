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
  SHAPE,
  TOKEN_SCHEMA,
  TYPOGRAPHY,
  type ShapeKey,
  type ThemeMode,
  type TokenDef,
  type TypographyKey,
} from './schema';

export interface ThemeState {
  colors: Record<ThemeMode, Record<string, string>>;
  typography: TypographyKey;
  shape: ShapeKey;
}

export const STORE_KEY = 'ent-tenant-theme-v2';
/** id du <style> injecté dans le <head> qui porte les variables calculées. */
export const STYLE_TAG_ID = 'tenant-theme-vars';

export function defaultThemeState(): ThemeState {
  const colors: Record<ThemeMode, Record<string, string>> = { light: {}, dark: {} };
  for (const t of TOKEN_SCHEMA) {
    colors.light[t.key] = t.light;
    colors.dark[t.key] = t.dark;
  }
  return { colors, typography: 'classique', shape: 'equilibre' };
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
 * Feuille de style complète : :root (clair), variante sombre par
 * prefers-color-scheme (sauf si data-theme="light" force le clair), et
 * :root[data-theme="dark"] qui l'emporte dans les deux sens.
 */
export function buildThemeCss(state: ThemeState): string {
  const lightCss = buildRuleBody(state, 'light');
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
  return state;
}

export function loadThemeState(): ThemeState {
  let raw: unknown = null;
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) raw = JSON.parse(s);
  } catch {
    /* stockage indisponible (navigation privée, quota) — on repart des défauts */
  }
  return normalizeThemeState(raw);
}

export function persistThemeState(state: ThemeState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* idem : la personnalisation reste appliquée en mémoire pour la session */
  }
}

export function clearPersistedThemeState(): void {
  try {
    localStorage.removeItem(STORE_KEY);
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
