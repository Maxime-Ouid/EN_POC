import type { ReactNode } from 'react';

export interface PresetRowProps {
  children?: ReactNode;
  /** Libellé du groupe pour les lecteurs d'écran (radiogroup). */
  label: string;
}

// Rangée de vignettes de preset (typographie, formes) — §Personnalisation.
// Rendue comme un groupe de boutons radio : le prototype utilisait des <div>
// cliquables, non atteignables au clavier.
export function PresetRow({ children, label }: PresetRowProps) {
  return (
    <div className="preset-row" role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
}
