import { Fragment } from 'react';

export interface BreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
  current: string;
}

/* Fil d'Ariane — vit dans le début de topbar (voir templates/topbarSlots.ts) :
   l'écran détail dossier l'y projette (dossiers › portefeuille › dossier), et
   retombe en tête de contenu hors AppShell (UiKit, démos).

   Depuis le retrait des titres de page (28/08/2026), c'est le SEUL endroit qui
   dit où l'on se trouve : il porte donc la rubrique parente en plus de l'écran.

   Les segments et les chevrons sont des enfants DIRECTS du conteneur flex.
   Les envelopper dans un <span> commun, comme c'était le cas, cassait le
   rendu : `svg.icon` est en `display:block` (components.css), donc le chevron
   passait à la ligne sous son libellé au lieu de le suivre. */
export function Breadcrumb({ items, current }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <Fragment key={i}>
          {item.onClick ? (
            <a
              href="#"
              className="dim"
              onClick={e => {
                e.preventDefault();
                item.onClick?.();
              }}
            >
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
          <svg className="icon" aria-hidden="true">
            <use href="#i-chevr" />
          </svg>
        </Fragment>
      ))}
      <b>{current}</b>
    </div>
  );
}
