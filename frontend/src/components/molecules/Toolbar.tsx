import type { ReactNode } from 'react';

export interface ToolbarProps {
  children?: ReactNode;
}

// Barre d'outils horizontale des écrans de l'interface actuelle (V1) : une
// rangée de boutons d'action au-dessus du contenu (« Nouveau dossier »,
// « Export CSV », « Membres du dossier »…). Se remplit de <Button size="sm">.
export function Toolbar({ children }: ToolbarProps) {
  return <div className="v1-toolbar">{children}</div>;
}

/** Séparateur vertical entre deux familles d'actions de la barre d'outils. */
export function ToolbarSeparator() {
  return <span className="v1-toolbar-sep" aria-hidden="true" />;
}
