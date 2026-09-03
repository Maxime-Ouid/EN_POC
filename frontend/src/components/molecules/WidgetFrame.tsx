import type { ReactNode } from 'react';

export interface WidgetFrameProps {
  title: string;
  icon: string;
  /** En édition : l'en-tête devient la poignée de déplacement et le retrait apparaît. */
  editing?: boolean;
  /** Libellé du lien vers l'écran complet. Absent = ce widget n'abrège aucun écran. */
  linkLabel?: string;
  onOpenScreen?: () => void;
  onRemove?: () => void;
  /**
   * Ouvre les réglages du widget. Absent = ce widget n'en a pas — le bouton
   * n'apparaît alors pas du tout, plutôt que grisé : un engrenage inerte sur
   * douze cartes sur treize apprendrait surtout à ne plus le regarder.
   */
  onConfigure?: () => void;
  /** Widget dont le contenu porte déjà sa propre carte (une StatCard, par exemple). */
  bare?: boolean;
  children?: ReactNode;
}

/**
 * Cadre commun à tous les widgets du tableau de bord : en-tête, corps
 * défilant, et en édition la poignée de déplacement.
 *
 * `bare` existe pour les cartes de chiffres : StatCard EST déjà une carte, la
 * réenvelopper donnerait deux bordures concentriques. Le cadre se réduit alors
 * à la couche d'édition (poignée + retrait), qui doit rester la même partout —
 * c'est ce qui fait qu'on saisit un widget au même endroit quel que soit son
 * contenu.
 *
 * La classe `.widget-editing` n'est pas décorative : c'est le sélecteur passé à
 * `draggableHandle` par DashboardGrid — toute la carte est saisissable. La
 * renommer ici casse le déplacement sans casser le rendu, donc silencieusement.
 * `.widget-handle`, elle, n'est plus qu'un repère visuel (« ce bloc se
 * déplace ») et porte le retrait ; `.widget-remove` et `.widget-config` sont exclues de la saisie
 * via `draggableCancel`, sinon ces boutons ne recevraient jamais leur clic.
 */
export function WidgetFrame({
  title,
  icon,
  editing,
  linkLabel,
  onOpenScreen,
  onRemove,
  onConfigure,
  bare,
  children,
}: WidgetFrameProps) {
  const classes = ['widget', bare ? 'widget-bare' : '', editing ? 'widget-editing' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {editing && (
        <div className="widget-handle">
          <svg className="icon">
            <use href="#i-dots" />
          </svg>
          <span className="widget-handle-title">{title}</span>
          <span className="widget-handle-tools">
            {onConfigure && (
              <button
                type="button"
                className="widget-config"
                onClick={onConfigure}
                aria-label={`Configurer le widget ${title}`}
              >
                <svg className="icon">
                  <use href="#i-settings" />
                </svg>
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className="widget-remove"
                onClick={onRemove}
                aria-label={`Retirer le widget ${title}`}
              >
                <svg className="icon">
                  <use href="#i-x" />
                </svg>
              </button>
            )}
          </span>
        </div>
      )}

      {!editing && !bare && (
        <div className="widget-head">
          <svg className="icon widget-icon">
            <use href={`#i-${icon}`} />
          </svg>
          <span className="widget-title">{title}</span>
          {linkLabel && onOpenScreen && (
            <button type="button" className="widget-link" onClick={onOpenScreen}>
              {linkLabel} →
            </button>
          )}
        </div>
      )}

      <div className="widget-body">{children}</div>
    </div>
  );
}
