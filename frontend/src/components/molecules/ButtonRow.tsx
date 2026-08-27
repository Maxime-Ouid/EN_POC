import type { ReactNode } from 'react';

export interface ButtonRowProps {
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Regroupe des boutons/filtres sur une ligne avec un espacement cohérent (.btn-row).
export function ButtonRow({ children, style }: ButtonRowProps) {
  return <div className="btn-row" style={style}>{children}</div>;
}
