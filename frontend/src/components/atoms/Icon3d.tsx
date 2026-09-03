import docPng from '../../assets/icons-3d/doc.png';
import folderPng from '../../assets/icons-3d/folder.png';
import layersPng from '../../assets/icons-3d/layers.png';
import msgPng from '../../assets/icons-3d/msg.png';
import trashPng from '../../assets/icons-3d/trash.png';
import usersPng from '../../assets/icons-3d/users.png';
import zipPng from '../../assets/icons-3d/zip.png';

// Correspondance identifiant du sprite -> illustration 3D. La clé est celle
// qu'attend <Icon id="…"> : un appelant qui passe déjà `folder` ou `file`
// bascule en 3D sans rien changer chez lui. `x` n'est là que pour la
// suppression dans un fil d'activité — la croix de fermeture d'une modale
// n'est pas une pastille et garde son glyphe (voir IconChip).
export const ICON_3D: Record<string, string> = {
  folder: folderPng,
  layers: layersPng,
  msg: msgPng,
  users: usersPng,
  file: docPng,
  zip: zipPng,
  x: trashPng,
};

// Illustrations 3D (src/assets/icons-3d) tenant la place du glyphe du sprite pour
// les sept types d'objets qui en ont une ; `has3d` dit si un identifiant en a.
export function has3d(icon: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICON_3D, icon);
}

export interface Icon3dProps {
  icon: string;
  className?: string;
}

// Illustration 3D (src/assets/icons-3d) tenant la place d'un glyphe du sprite.
// Rendue en image de fond d'un <span> décoratif : contrairement à <Icon>, elle
// porte ses propres couleurs et n'hérite pas de `currentColor` — elle n'est
// donc pas personnalisable par l'office, c'est une illustration, pas un token.
export function Icon3d({ icon, className }: Icon3dProps) {
  const src = ICON_3D[icon];
  if (!src) return null;
  return (
    <span
      className={className ? `icon-3d ${className}` : 'icon-3d'}
      style={{ backgroundImage: `url(${src})` }}
      aria-hidden="true"
    />
  );
}
