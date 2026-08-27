import { RowIcon } from '../atoms/RowIcon';
import type { ReactNode } from 'react';

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
  // `muted` n'atténue que l'icône (cadre neutre) : dans le prototype, le
  // libellé d'une ligne clôturée garde la couleur de texte normale.
  return (
    <td className="row-name">
      <RowIcon icon={icon} bg={iconBg} color={iconColor} muted={muted} />
      {children}
    </td>
  );
}
