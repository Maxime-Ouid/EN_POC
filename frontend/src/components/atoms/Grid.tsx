import type { ReactNode } from 'react';

export interface GridProps {
  columns: 2 | 3 | 4;
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Grille responsive — .grid-2 (1.5fr/1fr), .grid-3, .grid-4 — repasse à 1-2
// colonnes sous 980px (voir components.css).
export function Grid({ columns, children, style }: GridProps) {
  return (
    <div className={`grid grid-${columns}`} style={style}>
      {children}
    </div>
  );
}
