export interface RowIconProps {
  icon: string;
  bg: string;
  color: string;
  size?: number;
  muted?: boolean;
}

// Carré arrondi coloré associé à un type de ligne (dossier, fichier…) — §6.5.
export function RowIcon({ icon, bg, color, size, muted }: RowIconProps) {
  const style: React.CSSProperties = { background: bg, color };
  if (size) {
    style.width = size;
    style.height = size;
  }
  if (muted) {
    style.border = '1px solid var(--border)';
  }
  return (
    <div className="row-icon" style={style}>
      <svg className="icon" style={size ? { width: size * 0.47, height: size * 0.47 } : undefined}>
        <use href={`#i-${icon}`} />
      </svg>
    </div>
  );
}
