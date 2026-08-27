import type { ReactNode } from 'react';

export interface TableCardProps {
  headers: string[];
  children?: ReactNode;
}

// Enveloppe une <table> dans .card > .table-wrap — §6.5. Passer les <tr> déjà
// composés en children (typiquement via <RowName>/<Pill>/<Tag> pour les cellules).
export function TableCard({ headers, children }: TableCardProps) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

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

export interface RowNameProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  muted?: boolean;
  children?: ReactNode;
}

// Cellule <td class="row-name"> = RowIcon + libellé, motif systématique des
// tableaux du prototype (dossiers, documents, membres…).
export function RowName({ icon, iconBg, iconColor, muted, children }: RowNameProps) {
  return (
    <td className="row-name" style={muted ? { color: 'var(--ink-400)' } : undefined}>
      <RowIcon icon={icon} bg={iconBg} color={iconColor} muted={muted} />
      {children}
    </td>
  );
}

export interface RowMenuProps {
  onClick?: () => void;
}

// Icône "…" en fin de ligne, ouvre un menu contextuel (à implémenter côté appli).
export function RowMenu({ onClick }: RowMenuProps) {
  return (
    <td>
      <svg className="icon" style={{ color: 'var(--ink-400)', cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
        <use href="#i-dots" />
      </svg>
    </td>
  );
}
