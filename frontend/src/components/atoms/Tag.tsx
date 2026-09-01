import type { ReactNode } from 'react';

/**
 * Palette des tags — ensemble FERMÉ, et c'est le design system qui en est
 * propriétaire (pas l'API) : ce sont des intentions de couleur du thème, pas des
 * valeurs. `validators.TAG_COLORS` côté Django en est le miroir, et se contente
 * de refuser ce qui n'est pas dans cette liste.
 *
 * Chaque clé se résout en tokens du thème de l'office : un office qui
 * personnalise sa palette voit ses tags suivre, ce qu'un hexadécimal stocké en
 * base rendrait impossible.
 */
export type TagColor = 'brass' | 'info' | 'success' | 'warning' | 'critical' | 'neutral';

export const TAG_COLORS: TagColor[] = ['brass', 'info', 'success', 'warning', 'critical', 'neutral'];

/** Libellés des couleurs, pour les sélecteurs et les aides d'accessibilité. */
export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  brass: 'Violet',
  info: 'Bleu',
  success: 'Vert',
  warning: 'Orange',
  critical: 'Rouge',
  neutral: 'Gris',
};

export interface TagProps {
  icon?: string;
  /** Couleur du thème. Défaut : `brass` (l'accent de l'office). */
  color?: TagColor;
  /**
   * Ancien raccourci pour la variante grise, antérieur à `color`. Conservé
   * parce que plusieurs écrans l'utilisent pour un libellé qui n'est PAS un tag
   * du catalogue (le groupe d'un membre, par exemple) ; `plain` gagne sur
   * `color` quand les deux sont passés.
   */
  plain?: boolean;
  /** Présent = la pastille porte une croix de retrait (sélecteurs éditables). */
  onRemove?: () => void;
  /** Libellé de la croix pour les lecteurs d'écran ; défaut « Retirer ». */
  removeLabel?: string;
  children?: ReactNode;
}

// Classification libre (fond accent violet par défaut, ou une des couleurs du
// thème). Voir DESIGN_SYSTEM.md §6.4.
export function Tag({ icon, color = 'brass', plain, onRemove, removeLabel, children }: TagProps) {
  const resolved: TagColor = plain ? 'neutral' : color;
  return (
    <span className={`tag tag-${resolved}`}>
      {icon && (
        <svg>
          <use href={`#i-${icon}`} />
        </svg>
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          className="tag-remove"
          aria-label={removeLabel ?? 'Retirer'}
          // stopPropagation : ces pastilles vivent dans des lignes de tableau
          // cliquables — retirer un tag ne doit pas ouvrir le dossier.
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <svg>
            <use href="#i-x" />
          </svg>
        </button>
      )}
    </span>
  );
}
