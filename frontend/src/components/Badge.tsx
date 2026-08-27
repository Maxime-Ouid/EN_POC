import type { ReactNode } from 'react';

export type PillKind = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

export interface PillProps {
  kind: PillKind;
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Statut sémantique — voir DESIGN_SYSTEM.md §6.3.
export function Pill({ kind, children, style }: PillProps) {
  return (
    <span className={`pill ${kind}`} style={style}>
      {children}
    </span>
  );
}

export interface TagProps {
  icon?: string;
  plain?: boolean;
  children?: ReactNode;
}

// Classification libre (fond accent violet par défaut, ou .plain neutre).
export function Tag({ icon, plain, children }: TagProps) {
  return (
    <span className={plain ? 'tag plain' : 'tag'}>
      {icon && (
        <svg>
          <use href={`#i-${icon}`} />
        </svg>
      )}
      {children}
    </span>
  );
}

export interface BadgeProps {
  children?: ReactNode;
}

// Petit compteur rond (ex. nombre de dossiers dans la nav, questions dans un onglet).
export function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>;
}
