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
