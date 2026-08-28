import type { ReactNode } from 'react';

export interface CardProps {
  children?: ReactNode;
  padded?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
}

// Carte "verre dépoli" générique — §6.2. `padded` ajoute .card-pad (16-20px de
// padding interne) ; sans, la carte est pensée pour contenir un .table-wrap qui
// gère lui-même son padding.
export function Card({ children, padded, style, onClick, className }: CardProps) {
  const classes = ['card', padded ? 'card-pad' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} style={style} onClick={onClick}>
      {children}
    </div>
  );
}
