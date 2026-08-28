import { Badge } from '../atoms/Badge';
import type { ReactNode } from 'react';

export interface NavSubItemProps {
  active?: boolean;
  count?: number;
  onClick?: () => void;
  children?: ReactNode;
}

// Entrée de sous-menu de la sidebar (V1 : « Dossiers » → « Exports multiples »,
// « Espaces clients »…). Volontairement sans icône : dans l'interface actuelle,
// seules les rubriques de premier niveau en portent une, et l'indentation suffit
// à marquer la subordination.
export function NavSubItem({ active, count, onClick, children }: NavSubItemProps) {
  return (
    <button
      type="button"
      className={active ? 'nav-subitem active' : 'nav-subitem'}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
      {typeof count === 'number' && <Badge>{count}</Badge>}
    </button>
  );
}
