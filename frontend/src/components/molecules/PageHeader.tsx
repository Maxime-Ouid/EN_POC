import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Surtitre en capitales colorées (.eyebrow) — ex. « Pilotage », « Office ». */
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  /** Bloc d'actions aligné à droite du titre (boutons, filtres…). */
  actions?: ReactNode;
}

// En-tête d'écran : surtitre + titre + sous-titre, motif répété sur tous les
// écrans du prototype. `actions` bascule l'en-tête en ligne titre/boutons.
export function PageHeader({ eyebrow, title, sub, actions }: PageHeaderProps) {
  const head = (
    <div>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="page-title">{title}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
  );

  if (!actions) return head;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      {head}
      {actions}
    </div>
  );
}
