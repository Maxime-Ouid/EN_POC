/* ===========================================================================
   Positionnement de l'infobulle des entrées de navigation en mode « icônes
   seules ».

   Pourquoi du JavaScript pour ce qui ressemble à un `position:absolute` :
   `.nav` porte `overflow-y:auto` pour que les rubriques défilent. Un navigateur
   ne sait pas faire `overflow-y:auto` avec `overflow-x:visible` — il ramène le
   second à `auto`. Une infobulle en `position:absolute` sortant du rail serait
   donc rognée à 68 px, c'est-à-dire invisible.

   L'infobulle est donc en `position:fixed`, et ce module lui donne la géométrie
   de l'entrée survolée sous forme de custom properties. Le CHOIX du bord
   (droite du rail, au-dessus de la barre du bas…) reste au CSS, qui connaît
   déjà `[data-nav-placement]` — voir components.css.

   Un seul appel par survol, aucune écriture d'état React : rien ne se
   re-rend, la mise en page ne se relit qu'une fois.
   =========================================================================== */

/**
 * Mémorise la position de `el` sur `el` lui-même, pour son infobulle ou son
 * panneau de sous-menu.
 * À brancher sur `onMouseEnter` (et `onFocus` quand l'élément est focalisable).
 */
export function positionNavTooltip(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const s = el.style;
  // Centres : l'infobulle s'aligne sur le milieu de l'entrée, pas sur son coin.
  s.setProperty('--tip-cx', `${r.left + r.width / 2}px`);
  s.setProperty('--tip-cy', `${r.top + r.height / 2}px`);
  // Bord haut : un panneau de sous-menu s'aligne sur le HAUT de l'entrée, pas
  // sur son milieu — sinon il remonte à mesure qu'il s'allonge.
  s.setProperty('--tip-top-y', `${r.top}px`);
  // Bords, exprimés depuis les quatre côtés de la fenêtre : `position:fixed`
  // ne permet pas de dire « juste après cet élément », il faut la valeur.
  s.setProperty('--tip-after-x', `${r.right}px`);
  s.setProperty('--tip-before-x', `${window.innerWidth - r.left}px`);
  s.setProperty('--tip-after-y', `${r.bottom}px`);
  s.setProperty('--tip-before-y', `${window.innerHeight - r.top}px`);
}
