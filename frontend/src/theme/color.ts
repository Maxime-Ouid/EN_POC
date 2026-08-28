// Utilitaires couleur du moteur de personnalisation — portage TypeScript des
// fonctions du prototype (index_16.html, IIFE window.TenantTheme).
// Aucun état ici : uniquement des conversions pures, testables isolément.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ParsedColor {
  /** Toujours au format #rrggbb — alimente un <input type="color">. */
  hex: string;
  /** Alpha 0..1 extrait de la valeur source (1 si opaque). */
  a: number;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const c = Math.max(0, Math.min(255, Math.round(v)));
        const s = c.toString(16);
        return s.length === 1 ? `0${s}` : s;
      })
      .join('')
  );
}

/**
 * Accepte #rgb / #rrggbb / #rrggbbaa / rgb(...) / rgba(...) / rgb(r g b / a%)
 * et renvoie toujours { hex:'#rrggbb', a:0..1 }.
 *
 * Les deux syntaxes rgb() coexistent réellement dans tokens.css (ex.
 * `--card-glass-bg` clair vaut `rgb(255 255 255 / 85%)` alors que `--card-bg`
 * vaut `rgba(255,255,255,.5)`) : les deux doivent être lisibles sans quoi
 * l'écran Apparence afficherait du noir à la place de la vraie couleur.
 */
export function parseColor(input: string): ParsedColor {
  const str = String(input).trim();

  if (str[0] === '#') {
    let h = str.slice(1);
    if (h.length === 3) {
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    }
    const rgb = hexToRgb(`#${h.slice(0, 6)}`);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { hex: rgbToHex(rgb.r, rgb.g, rgb.b), a };
  }

  const m = str.match(/rgba?\(([^)]+)\)/);
  if (m) {
    let body = m[1];
    let alphaPart: string | null = null;
    const slashIdx = body.indexOf('/');
    if (slashIdx > -1) {
      alphaPart = body.slice(slashIdx + 1).trim();
      body = body.slice(0, slashIdx);
    }
    const comps = body.split(',').join(' ').trim().split(/\s+/);
    const r = parseFloat(comps[0]);
    const g = parseFloat(comps[1]);
    const b = parseFloat(comps[2]);
    const aRaw = alphaPart !== null ? alphaPart : comps[3];
    const a =
      aRaw !== undefined
        ? String(aRaw).indexOf('%') > -1
          ? parseFloat(aRaw) / 100
          : parseFloat(aRaw)
        : 1;
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return { hex: '#000000', a: 1 };
    return { hex: rgbToHex(r, g, b), a: Number.isNaN(a) ? 1 : a };
  }

  return { hex: '#000000', a: 1 };
}

/** Recompose une valeur CSS : hex si opaque, rgba(...) sinon. */
export function composeColor(hex: string, a = 1): string {
  const alpha = clamp01(a);
  if (alpha >= 1) return hex;
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.round(alpha * 100) / 100})`;
}
