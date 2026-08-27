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
