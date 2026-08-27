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

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  iconBg: string;
  iconColor: string;
  delta?: { text: string; tone: 'up' | 'warn' };
  sub?: ReactNode;
}

// Carte de statistique du dashboard — §6.2.
export function StatCard({ label, value, icon, iconBg, iconColor, delta, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label" style={{ margin: 0 }}>
          {label}
        </span>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          <svg className="icon">
            <use href={`#i-${icon}`} />
          </svg>
        </div>
      </div>
      <div className="stat-value mono">{value}</div>
      {delta && (
        <div className={delta.tone === 'up' ? 'stat-delta up' : 'stat-delta warn-delta'}>
          {delta.tone === 'up' && (
            <svg className="icon" style={{ width: 11, height: 11 }}>
              <use href="#i-up" />
            </svg>
          )}
          {delta.text}
        </div>
      )}
      {sub && <div className="tiny dim" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

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
