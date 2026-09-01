/* ===========================================================================
   Placement des widgets dans une grille FERMÉE (12 × 12).

   Toutes les fonctions ici sont pures et testables sans React — c'est ce qui
   permet de vérifier qu'aucun template ne se chevauche ni ne déborde, ce
   qu'aucun typage ne rattrape (voir la suite d'assertions lancée à la main dans
   le sandbox, faute de runner de tests dans ce dépôt).

     packWidgets      des identifiants          → des positions, ou rien si plein
     findFreeSlot     une grille + une taille   → la première place libre
     resolveWidgets   des positions du serveur  → des positions sûres
     appendWidget     une grille + un widget    → la grille, ou null si plein

   `appendWidget` renvoyant NULL est le cœur du modèle : un écran plein refuse
   un widget de plus, et l'appelant propose alors un onglet. Poser le widget
   hors de l'écran « pour que ça passe » redonnerait exactement le tableau de
   bord défilant qu'on cherche à éviter.
   =========================================================================== */

import { DASHBOARD_COLS, DASHBOARD_ROWS, type DashboardPage, type WidgetPlacement } from './types';
import { WIDGETS_BY_ID } from './registry';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Première place libre pour une boîte de w × h, balayée de haut en bas puis de
 * gauche à droite — l'ordre de lecture. `null` si l'écran est plein.
 *
 * Balayage naïf sur 144 cases : à cette taille, un algorithme malin serait plus
 * long à relire qu'à exécuter.
 */
export function findFreeSlot(
  occupied: readonly Box[],
  w: number,
  h: number,
): { x: number; y: number } | null {
  if (w > DASHBOARD_COLS || h > DASHBOARD_ROWS) return null;
  for (let y = 0; y + h <= DASHBOARD_ROWS; y++) {
    for (let x = 0; x + w <= DASHBOARD_COLS; x++) {
      const candidate = { x, y, w, h };
      if (!occupied.some(box => overlaps(box, candidate))) return { x, y };
    }
  }
  return null;
}

/**
 * Range une liste d'identifiants dans un écran, à leur taille naturelle.
 *
 * Les widgets qui ne tiennent pas sont ÉCARTÉS, pas empilés hors écran : un
 * template trop chargé doit se voir en développement (l'avertissement plus bas)
 * et se corriger en le découpant en deux onglets.
 */
export function packWidgets(ids: readonly string[]): WidgetPlacement[] {
  const placed: WidgetPlacement[] = [];
  for (const id of ids) {
    const def = WIDGETS_BY_ID[id];
    if (!def || placed.some(p => p.id === id)) continue;
    const { w, h } = def.defaultSize;
    const slot = findFreeSlot(placed, w, h);
    if (!slot) {
      if (import.meta.env.DEV) {
        console.warn(
          `[dashboard] le widget « ${id} » ne tient pas dans son écran de template — ` +
            'le découper en deux onglets (voir templates.ts).',
        );
      }
      continue;
    }
    placed.push({ id, x: slot.x, y: slot.y, w, h });
  }
  return placed;
}

/**
 * Nettoie une disposition lue (serveur, ou template plus ancien) : widgets
 * inconnus écartés, doublons écartés, tailles et positions ramenées dans la
 * grille. Un widget qui, une fois borné, ne tient plus nulle part est retiré.
 *
 * Le serveur borne déjà la FORME (entiers, longueurs, nombre d'éléments — voir
 * validators.clean_dashboard_payload) ; il ne peut pas borner ce qu'il ne
 * connaît pas, à savoir la taille minimale de chaque widget et la géométrie de
 * la grille. C'est ici que ça se rattrape.
 */
export function resolveWidgets(placements: readonly WidgetPlacement[]): WidgetPlacement[] {
  const seen = new Set<string>();
  const out: WidgetPlacement[] = [];

  for (const p of placements) {
    const def = WIDGETS_BY_ID[p.id];
    if (!def || seen.has(p.id)) continue;
    seen.add(p.id);

    const w = clamp(p.w, def.minSize.w, DASHBOARD_COLS);
    const h = clamp(p.h, def.minSize.h, DASHBOARD_ROWS);
    const x = clamp(p.x, 0, DASHBOARD_COLS - w);
    const y = clamp(p.y, 0, DASHBOARD_ROWS - h);

    const box = { x, y, w, h };
    if (out.some(other => overlaps(other, box))) {
      // Chevauchement après bornage : on relance le widget sur la première
      // place libre plutôt que de le laisser recouvrir un voisin.
      const slot = findFreeSlot(out, w, h);
      if (!slot) continue;
      out.push({ ...p, ...slot, w, h });
      continue;
    }
    out.push({ ...p, ...box });
  }

  return out;
}

/** Pose un widget sur la première place libre. `null` = écran plein. */
export function appendWidget(
  current: readonly WidgetPlacement[],
  id: string,
): WidgetPlacement[] | null {
  const def = WIDGETS_BY_ID[id];
  if (!def) return null;
  if (current.some(p => p.id === id)) return [...current];
  const slot = findFreeSlot(current, def.defaultSize.w, def.defaultSize.h);
  if (!slot) return null;
  return [...current, { id, ...slot, w: def.defaultSize.w, h: def.defaultSize.h }];
}

export function removeWidget(current: readonly WidgetPlacement[], id: string): WidgetPlacement[] {
  return current.filter(p => p.id !== id);
}

/**
 * Échange les places de deux widgets. `null` si l'échange n'est pas possible.
 *
 * Chacun prend le COIN HAUT-GAUCHE de l'autre, pas sa boîte : deux widgets de
 * tailles différentes ne peuvent pas occuper la même surface. Quand les tailles
 * diffèrent, l'échange peut donc déborder de la grille ou recouvrir un
 * troisième widget — c'est vérifié, et refusé le cas échéant plutôt que
 * bricolé. Entre deux cartes de même gabarit (le cas courant : deux panneaux,
 * deux chiffres-clés) l'échange réussit toujours.
 *
 * Le refus est silencieux ici ; c'est à l'appelant de l'expliquer, parce que
 * lui seul connaît les noms des widgets concernés.
 */
export function swapWidgets(
  widgets: readonly WidgetPlacement[],
  draggedId: string,
  targetId: string,
): WidgetPlacement[] | null {
  if (draggedId === targetId) return null;
  const dragged = widgets.find(w => w.id === draggedId);
  const target = widgets.find(w => w.id === targetId);
  if (!dragged || !target) return null;

  const moved = { ...dragged, x: target.x, y: target.y };
  const displaced = { ...target, x: dragged.x, y: dragged.y };
  const inBounds = (b: Box) =>
    b.x >= 0 && b.y >= 0 && b.x + b.w <= DASHBOARD_COLS && b.y + b.h <= DASHBOARD_ROWS;
  if (!inBounds(moved) || !inBounds(displaced)) return null;

  const next = widgets.map(w =>
    w.id === draggedId ? moved : w.id === targetId ? displaced : w,
  );
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      if (overlaps(next[i], next[j])) return null;
    }
  }
  return next;
}

/**
 * Deux dispositions sont-elles identiques ? Comparaison PAR IDENTIFIANT, pas
 * par position dans le tableau : react-grid-layout renvoie ses éléments dans
 * son ordre à lui, qui change dès qu'on déplace un widget. Comparer index par
 * index ferait donc voir une modification là où rien n'a bougé — et le hook
 * enverrait un PUT au serveur à chaque redimensionnement de fenêtre.
 */
export function sameLayout(a: readonly WidgetPlacement[], b: readonly WidgetPlacement[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map(p => [p.id, p]));
  return a.every(p => {
    const q = byId.get(p.id);
    return !!q && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h;
  });
}

/* --- Onglets --------------------------------------------------------------- */

/**
 * Identifiant d'onglet : horodatage en base 36 plus deux caractères au hasard.
 *
 * Volontairement PAS dérivé du nom : deux onglets peuvent s'appeler pareil, et
 * renommer un onglet ne doit pas changer son identité (sinon on perdrait
 * l'onglet actif au renommage). Il doit aussi passer le validateur du serveur,
 * qui n'accepte que des minuscules et des tirets.
 */
export function newPageId(): string {
  const random = Math.random().toString(36).slice(2, 4);
  return `p-${Date.now().toString(36)}-${random}`;
}

/** Nom d'onglet libre du type « Écran 2 », sans doublon avec l'existant. */
export function nextPageName(pages: readonly DashboardPage[]): string {
  const taken = new Set(pages.map(p => p.name));
  for (let i = pages.length + 1; ; i++) {
    const name = `Écran ${i}`;
    if (!taken.has(name)) return name;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
