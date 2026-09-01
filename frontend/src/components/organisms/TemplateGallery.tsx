import { Modal } from './Modal';
import { Button } from '../atoms/Button';

export interface TemplateGalleryCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TemplateGalleryEntry {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Libellé de famille affiché en tête de groupe (« Par rôle », « Par métier »). */
  group: string;
  /** Aperçu : les rectangles du PREMIER écran, en unités de grille. */
  cells: TemplateGalleryCell[];
  widgetCount: number;
  /** Nombre d'onglets. L'aperçu n'en montre qu'un, le compte dit le reste. */
  pageCount: number;
}

export interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  entries: TemplateGalleryEntry[];
  /** Template appliqué en dernier — mis en avant dans la galerie. */
  activeId: string | null;
  cols: number;
  onApply: (id: string) => void;
}

/**
 * Galerie des dispositions prêtes à l'emploi.
 *
 * L'aperçu est dessiné à partir des positions RÉELLES du template (une grille
 * CSS aux mêmes colonnes), pas à partir d'une image : une vignette peinte à la
 * main finirait par mentir dès qu'un template bouge, et personne ne s'en
 * apercevrait avant de l'avoir appliqué.
 *
 * Appliquer un template REMPLACE la disposition en cours. Le bouton le dit, et
 * l'appelant confirme — voir DashboardScreen : c'est la seule action de l'accueil
 * qui détruit du travail de rangement.
 */
export function TemplateGallery({
  open,
  onClose,
  entries,
  activeId,
  cols,
  onApply,
}: TemplateGalleryProps) {
  const groups = entries.reduce<{ label: string; items: TemplateGalleryEntry[] }[]>(
    (acc, entry) => {
      const found = acc.find(g => g.label === entry.group);
      if (found) found.items.push(entry);
      else acc.push({ label: entry.group, items: [entry] });
      return acc;
    },
    [],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choisir une disposition"
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <p className="tpl-gallery-intro">
        Une disposition sert de point de départ : tout reste déplaçable ensuite.
        L'appliquer remplace l'agencement actuel de votre accueil.
      </p>
      {groups.map(group => (
        <div className="tpl-gallery-group" key={group.label}>
          <div className="tpl-gallery-group-title">{group.label}</div>
          <div className="tpl-gallery">
            {group.items.map(entry => {
              const rows = entry.cells.reduce((max, c) => Math.max(max, c.y + c.h), 1);
              return (
                <button
                  type="button"
                  key={entry.id}
                  className={
                    entry.id === activeId ? 'tpl-gallery-card is-active' : 'tpl-gallery-card'
                  }
                  onClick={() => onApply(entry.id)}
                  aria-pressed={entry.id === activeId}
                >
                  <div
                    className="tpl-preview"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                  >
                    {entry.cells.map((cell, i) => (
                      <span
                        key={i}
                        className="tpl-preview-cell"
                        style={{
                          gridColumn: `${cell.x + 1} / span ${cell.w}`,
                          gridRow: `${cell.y + 1} / span ${cell.h}`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="tpl-gallery-head">
                    <svg className="icon tpl-gallery-icon">
                      <use href={`#i-${entry.icon}`} />
                    </svg>
                    <span className="tpl-gallery-name">{entry.name}</span>
                  </div>
                  <div className="tpl-gallery-desc">{entry.desc}</div>
                  <div className="tpl-gallery-count">
                    {entry.pageCount > 1
                      ? `${entry.pageCount} écrans · ${entry.widgetCount} widgets`
                      : `${entry.widgetCount} widgets`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Modal>
  );
}
