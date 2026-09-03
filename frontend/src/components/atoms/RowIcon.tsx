import { IconChip } from './IconChip';

export interface RowIconProps {
  icon: string;
  bg: string;
  color: string;
  size?: number;
  muted?: boolean;
}

// Carré arrondi coloré associé à un type de ligne (dossier, fichier…) — §6.5.
// Délègue à IconChip, qui bascule sur l'illustration 3D quand l'objet en a une.
export function RowIcon({ icon, bg, color, size, muted }: RowIconProps) {
  return <IconChip icon={icon} bg={bg} color={color} chip="row-icon" size={size} muted={muted} />;
}
