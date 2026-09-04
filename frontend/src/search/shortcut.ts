/* ===========================================================================
   Libellé du raccourci d'ouverture de la palette.

   Il était écrit « ⌘K » en dur dans la topbar, alors que le raccourci écouté
   dans AppShell a toujours accepté les deux modificateurs (⌘ ET Ctrl). Sur les
   postes des études — Windows dans leur immense majorité — l'interface annonçait
   donc une touche qui n'existe pas sur le clavier de l'utilisateur : un
   raccourci affiché faux vaut moins qu'un raccourci non affiché.
   =========================================================================== */

/** `navigator.platform` est déprécié mais reste le seul indicateur fiable côté
    navigateur ; `userAgentData` n'est pas implémenté partout. La détection ne
    sert qu'à choisir un libellé — se tromper n'empêche rien de fonctionner. */
function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const source = `${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`;
  return /Mac|iPhone|iPad|iPod/i.test(source);
}

/** Ce que la topbar affiche dans son `<kbd>`. */
export const SEARCH_SHORTCUT_LABEL = isApplePlatform() ? '⌘K' : 'Ctrl K';

/** Même raccourci, dans la grammaire d'`aria-keyshortcuts` : les deux
    combinaisons sont réellement écoutées, on les déclare toutes les deux. */
export const SEARCH_SHORTCUT_ARIA = 'Meta+K Control+K';
