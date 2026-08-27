export type BarTone = 'accent' | 'success' | 'warn';

export interface BarTrackProps {
  /** Remplissage en pourcentage (0–100). Borné pour éviter un débordement. */
  percent: number;
  tone?: BarTone;
  style?: React.CSSProperties;
  /** Libellé lu par les lecteurs d'écran (la barre seule n'a aucun texte). */
  label?: string;
}

// Barre de progression fine (.bar-track / .bar-fill) — quota de stockage,
// part d'un espace client dans le total. `tone` porte le sens : accent par
// défaut, success/warn pour un seuil atteint.
export function BarTrack({ percent, tone = 'accent', style, label }: BarTrackProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const toneClass = tone === 'accent' ? '' : ` ${tone === 'warn' ? 'warn' : 'success'}`;
  return (
    <div
      className="bar-track"
      style={style}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`bar-fill${toneClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
