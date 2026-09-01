/* ===========================================================================
   Conversion pixels → cases de grille, pour savoir sur QUOI une carte a été
   lâchée.

   Ce fichier existe parce que ce calcul a été faux trois fois de suite, à
   chaque fois pour une raison différente et à chaque fois invisible : le rendu
   restait correct, seul l'échange ne partait pas. Tant qu'il vivait dans le
   composant, mêlé à des refs et à des évènements du navigateur, rien ne pouvait
   l'exercer sans navigateur.

   Ici, tout est en clair : des nombres entrent, une case sort. C'est
   vérifiable sans React et sans DOM — voir les assertions de placement.

   Volontairement hors de tout composant, comme navModel.ts et officeRoles.ts :
   DashboardGrid s'en sert, personne d'autre n'a à l'importer.
   =========================================================================== */

export interface GridBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DropGeometry {
  /** Coin haut-gauche et largeur du cadre de la grille, en pixels écran. */
  frame: { left: number; top: number; width: number };
  /** Taille de la carte déplacée, en pixels. */
  card: { width: number; height: number };
  /** Position du pointeur au moment du lâcher, en pixels écran. */
  pointer: { x: number; y: number };
  /**
   * Décalage entre le pointeur et le coin de la carte, mesuré à la saisie.
   * Sans lui, une carte attrapée par son bord droit serait réputée déposée une
   * demi-carte trop à droite, et l'échange se ferait avec le mauvais voisin.
   */
  grab: { dx: number; dy: number };
  cols: number;
  rows: number;
  rowHeight: number;
  margin: number;
}

/**
 * Case de la grille sous le CENTRE de la carte déposée.
 *
 * Le centre, et non le pointeur ni le coin : c'est ce qui correspond à « la
 * carte est surtout là ». Un coin suffirait à désigner le voisin du dessus
 * quand on déborde d'un pixel, et le pointeur dépend de l'endroit où l'on a
 * attrapé la carte.
 *
 * `null` si le dépôt tombe hors de la grille.
 */
export function cellUnderDrop(g: DropGeometry): { x: number; y: number } | null {
  const colWidth = (g.frame.width - g.margin * (g.cols - 1)) / g.cols;
  if (colWidth <= 0) return null;

  const cardLeft = g.pointer.x - g.grab.dx;
  const cardTop = g.pointer.y - g.grab.dy;
  const centerX = cardLeft + g.card.width / 2 - g.frame.left;
  const centerY = cardTop + g.card.height / 2 - g.frame.top;

  const x = Math.floor(centerX / (colWidth + g.margin));
  const y = Math.floor(centerY / (g.rowHeight + g.margin));
  if (x < 0 || x >= g.cols || y < 0 || y >= g.rows) return null;
  return { x, y };
}

/**
 * Décalage en pixels pour amener une case (fromX, fromY) sur une case
 * (toX, toY) — l'aperçu d'échange déplace la carte visée vers la place que
 * libère celle qu'on traîne.
 */
export function cellOffset(
  from: { x: number; y: number },
  to: { x: number; y: number },
  g: Pick<DropGeometry, 'frame' | 'cols' | 'rowHeight' | 'margin'>,
): { dx: number; dy: number } {
  const colWidth = (g.frame.width - g.margin * (g.cols - 1)) / g.cols;
  return {
    dx: (to.x - from.x) * (colWidth + g.margin),
    dy: (to.y - from.y) * (g.rowHeight + g.margin),
  };
}

/**
 * Identifiant du widget occupant la case de dépôt, en excluant celui qu'on
 * déplace. `null` si le dépôt vise une case libre ou l'extérieur de la grille.
 */
export function widgetUnderDrop(
  boxes: readonly GridBox[],
  draggedId: string,
  g: DropGeometry,
): string | null {
  const cell = cellUnderDrop(g);
  if (!cell) return null;
  const hit = boxes.find(
    box =>
      box.id !== draggedId &&
      cell.x >= box.x &&
      cell.x < box.x + box.w &&
      cell.y >= box.y &&
      cell.y < box.y + box.h,
  );
  return hit?.id ?? null;
}
