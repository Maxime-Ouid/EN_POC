import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type PillKind = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

/* Glyphe par défaut de chaque intention. Il est choisi pour l'INTENTION, pas
   pour le libellé — un même kind sert à « Sans réponse » comme à « Nouveau ».
   Quand le défaut tombe à côté, passer `icon="clock"` ; `icon={null}` revient
   à la simple pastille pleine. */
const KIND_ICON: Record<PillKind, string | null> = {
  success: 'check',
  warning: 'clock',
  critical: 'x',
  info: 'eye',
  neutral: null,
};

export interface PillProps {
  kind: PillKind;
  /** Icône du sprite. Absent = défaut du kind ; null = pastille simple. */
  icon?: string | null;
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Statut sémantique — voir DESIGN_SYSTEM.md §6.3.
export function Pill({ kind, icon, children, style }: PillProps) {
  const glyph = icon === undefined ? KIND_ICON[kind] : icon;
  return (
    <span className={glyph ? `pill ${kind} with-icon` : `pill ${kind}`} style={style}>
      {glyph ? (
        <span className="pill-ico">
          <Icon id={glyph} />
        </span>
      ) : null}
      {children}
    </span>
  );
}
